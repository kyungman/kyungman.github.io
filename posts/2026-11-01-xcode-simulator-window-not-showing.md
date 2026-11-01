---
title: "Xcode에서는 실행 중인데 시뮬레이터 창이 뜨지 않을 때"
date: "2026-11-01"
slug: "xcode-simulator-window-not-showing"
description: "가상 기기는 Booted인데 Device Hub는 시작 전으로 표시하던 문제. CoreDeviceService의 상태 불일치를 확인하고 데이터 초기화 없이 복구한 과정."
tags: ["Xcode", "iOS", "트러블슈팅"]
---

Xcode에서 해냈콩 앱을 실행했는데 시뮬레이터 창이 나타나지 않았다. 빌드 오류는 없었고, Xcode 상단에는 앱이 실행 중이라고 표시됐다.

```text
Running HaenaetKong on iPhone 18 Pro Max
```

기다려도 화면은 뜨지 않았다. 확인해 보니 가상 기기는 이미 부팅돼 있었지만, 기기 화면을 표시하는 쪽에서 상태를 제대로 인식하지 못하고 있었다.

이 글은 **Xcode 27.2 환경에서 실제로 확인한 증상과 복구 과정**을 정리한 기록이다. 같은 증상이라도 원인이 다를 수 있으므로, 초기화하기 전에 각 도구가 보고 있는 상태부터 비교하는 것이 좋다.

## 가상 기기는 부팅됐는데 화면이 보이지 않았다

터미널에서 실행 중인 가상 기기를 확인했다.

```bash
xcrun simctl list devices booted
```

출력에는 Xcode에서 선택한 기기가 포함돼 있었다. 식별자는 아래 예시에서 생략했다.

```text
iPhone 18 Pro Max (...) (Booted)
```

`Booted`는 가상 기기의 부팅 상태다. 화면을 표시하는 앱이 그 기기에 정상적으로 연결됐다는 뜻까지 보장하지는 않는다.

실제로 이번에는 Xcode의 실행 상태, `simctl`의 부팅 상태, 기기 화면의 표시 상태가 서로 맞지 않았다.

## 현재 설치 환경에서는 Device Hub를 확인해야 했다

처음에는 익숙한 Simulator 앱을 찾았다. 하지만 이 환경의 Xcode 27.2 설치에는 기존 위치의 `Simulator.app`이 없었고, 다음 위치에 `DeviceHub.app`이 있었다.

```text
/Applications/Xcode.app/Contents/Applications/DeviceHub.app
```

Device Hub를 열었더니 문제가 더 명확해졌다.

- `simctl`에서는 부팅된 기기가 Device Hub에서는 시작 전 상태로 보였다.
- Xcode에서 선택한 iPhone 18 Pro Max가 Device Hub 목록에 나타나지 않았다.
- 다른 부팅된 가상 기기에서 **Start**를 누르면 다음 오류가 발생했다.

```text
Unable to boot device in current state: Booted
```

이미 부팅된 기기를 다시 부팅하려고 한 것이다. Device Hub가 보고 있는 상태와 실제 가상 기기의 상태가 다르다는 증거였다.

## 기기 상태 전달이 갱신되지 않고 있었다

로그에서도 같은 상황을 확인했다. 가상 기기의 부팅 작업은 성공했지만, Device Hub는 해당 기기를 계속 종료되거나 연결되지 않은 상태로 보고 있었다.

조사 과정에서는 두 서비스를 구분했다.

| 서비스 | 이번 조사에서 확인한 역할 |
| --- | --- |
| `CoreSimulatorService` | 가상 기기의 부팅 상태 확인과 실행에 관여했다. |
| `CoreDeviceService` | Device Hub에 전달되는 기기 목록과 연결 상태에 관여했다. |

Device Hub만 종료했다가 다시 열어도 문제가 유지됐다. 가상 기기를 종료한 뒤 Device Hub에서 다시 부팅해도 화면 연결은 복구되지 않았다.

이후 `CoreSimulatorService`를 재시작했지만 Device Hub에는 여전히 이전 기기 목록이 표시됐다. **`CoreDeviceService`까지 재시작한 뒤 누락됐던 기기가 목록에 나타나고 화면 연결이 복구됐다.**

이 사례에서는 CoreDevice 쪽의 기기 상태 갱신 문제로 원인을 좁힐 수 있었다. 다만 어떤 계기로 상태 불일치가 처음 발생했는지까지는 확인하지 못했다. Xcode 업데이트나 특정 버전의 버그 때문이라고 단정할 근거도 없었다.

## 같은 증상이라면 이렇게 확인한다

> 서비스를 재시작하기 전에 현재 디버깅 작업을 정리한다. 연결된 기기의 디버깅 세션이 끊길 수 있다. 특히 CoreSimulator 서비스를 재시작하면 실행 중인 가상 기기들이 종료될 수 있다. 아래 절차는 저장 데이터 삭제를 포함하지 않지만, 서비스 재시작에 따른 실행 중단까지 없는 것은 아니다.

### 1. 가상 기기의 실제 부팅 상태를 확인한다

```bash
xcrun simctl list devices booted
```

Xcode에서 선택한 기기가 `Booted`인데 화면이 없다면, 기기 화면을 표시하는 앱의 상태를 함께 확인한다.

이번 환경에서는 다음 명령으로 Device Hub를 열 수 있었다.

```bash
open "/Applications/Xcode.app/Contents/Applications/DeviceHub.app"
```

설치된 Xcode 버전에 따라 앱 이름과 경로는 다를 수 있다. 위 경로가 없다면 자신의 Xcode 설치 위치부터 확인한다.

### 2. Device Hub를 종료하고 다시 연다

창을 닫는 데서 끝내지 않고 Device Hub를 **⌘Q**로 종료한 뒤 다시 실행한다.

이 단계에서 기기 목록과 화면이 정상으로 돌아오면 서비스 재시작까지 진행할 필요는 없다.

### 3. 상태 불일치가 계속되면 사용자 계정의 CoreDevice 서비스를 재시작한다

현재 사용자 계정의 프로세스를 확인한다.

```bash
pgrep -u "$(id -u)" -x CoreDeviceService
```

프로세스가 확인되고 같은 상태 불일치가 계속된다면, Device Hub를 종료한 상태에서 다음 명령으로 해당 사용자 서비스에 종료 신호를 보낼 수 있다.

```bash
pkill -TERM -u "$(id -u)" -x CoreDeviceService
```

이 명령은 현재 사용자 계정의 `CoreDeviceService`를 대상으로 한다. 가상 기기의 저장 데이터를 지우는 명령은 아니다. 위에서 안내한 것처럼 연결과 디버깅 세션은 중단될 수 있다.

그다음 Device Hub를 다시 열고 기기 목록을 확인한다.

```bash
open "/Applications/Xcode.app/Contents/Applications/DeviceHub.app"
```

이번에는 이 단계 이후 iPhone 18 Pro Max가 목록에 나타났고, 부팅 중인 기기의 화면도 연결됐다.

### 4. 부팅이 끝난 뒤 Xcode에서 다시 실행한다

기기 화면이 복구된 다음에는 Xcode에 남아 있던 실행 작업을 정리했다. 기기의 부팅이 끝난 것을 확인하고 앱을 다시 실행했다.

최종적으로는 다음 결과를 확인했다.

- Device Hub에서 iPhone 18 Pro Max가 정상적으로 표시됐다.
- 가상 기기의 홈 화면이 나타났다.
- Xcode에서 실행한 해냈콩의 시작 화면이 표시됐다.
- 기기 창을 독립된 창으로 열어 사용할 수 있었다.

## 이번에는 기기 초기화가 필요하지 않았다

복구 과정에서 가상 기기를 삭제하거나 **Erase All Content and Settings**를 실행하지 않았다. Derived Data 삭제나 앱 코드 수정도 하지 않았다.

이번 문제를 확인하는 데 도움이 된 것은 다음 세 상태를 따로 보는 일이었다.

1. Xcode가 표시하는 앱 실행 상태
2. `simctl`이 표시하는 가상 기기의 부팅 상태
3. Device Hub가 표시하는 기기 목록과 화면 연결 상태

Xcode에 실행 중이라고 표시돼도 화면 연결은 별도로 실패할 수 있다. 같은 증상을 만났다면 초기화부터 하기보다, 실제 부팅 상태와 화면을 표시하는 앱의 상태가 일치하는지 먼저 확인해 볼 만하다.

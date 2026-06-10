# [T4] 공통 동작 컴포넌트 (shadcn 재스킨)

**라벨:** `component`
**선행:** T2
**참조:** 가이드 15.1·15.2·15.4

---

## 목적
동작 중심 컴포넌트만 shadcn/ui로 도입하고 DESIGN.md 토큰으로 재스킨한다. 코드 복사 방식이라 파일은 프로젝트 소유 — 기본 룩을 즉시 재스킨하되 **접근성 동작은 깨뜨리지 않는다.**

---

## 1. 도입 목록 (15.1 — 정확히 이것만)
`Dialog(Modal)` · `Toast(sonner)` · `Popover` · `DropdownMenu` · `Select` · `Tabs` · `Sheet`(모바일 네비)
- **목록 외 shadcn 컴포넌트 추가 설치 금지.** 시각 컴포넌트(Button·Card·Badge·Input)는 T3 직접 구현분을 쓰고 shadcn 버전 도입 금지.

## 2. 재스킨 규칙
- [ ] 설치 즉시 DESIGN.md 토큰 적용 — **기본 zinc 팔레트·기본 radius 제거.** 필 버튼·24px 카드·primary 블루.
- [ ] 오버레이/팝업 표면은 `surface-card`/`surface-dark-elevated`, 텍스트 토큰 사용.

## 3. 보존해야 할 접근성 동작 (재스킨 시 깨뜨리지 말 것)
| 컴포넌트 | Radix 제공 동작 |
|---|---|
| Modal(Dialog) | 포커스 트랩, 닫힘 시 트리거 포커스 복귀, ESC·오버레이 닫기, `role="dialog"`+`aria-modal`+`aria-labelledby`, body 스크롤 잠금 |
| Toast(sonner) | `aria-live` 기반 스크린리더 자동 낭독, 자동 소멸 4초, 전역 1개 컨테이너 |
| Popover | 트리거 `aria-expanded`, ESC·외부 클릭 닫기, 포커스 복귀 |
- `DialogTitle`을 시각적으로 숨기더라도 **제거하지 않는다**(aria 연결 유지).

## 4. 사용처 (다른 태스크와 계약)
- **Toast** → T6 errorCode→UI 매핑(4.2)의 출력 채널. 성공/오류 변형.
- **Modal** → 낙관락 재편집 확인(8.3 `confirmReedit`), 미디어 삭제 차단 안내(6.3).
- **Popover** → T12 캘린더 "+n" 더보기, 네비 드롭다운.
- **Sheet** → T7 모바일 햄버거 네비(768px 미만).

## 5. 완료 조건
- [ ] 7개 컴포넌트 도입 + 토큰 재스킨
- [ ] Toast 전역 컨테이너(성공/오류, 4초 자동소멸)
- [ ] 목록 외 컴포넌트 미설치

## 6. 검수 기준 (15.4 — shadcn 재스킨)
- [ ] Modal: Tab 순환이 모달 밖으로 안 나가고, 닫힘 시 트리거로 포커스 복귀, 열림 중 배경 스크롤 잠금(스타일 수정 후에도).
- [ ] Toast: 스크린리더(VoiceOver 등)가 새 토스트를 자동 낭독한다.
- [ ] 모든 shadcn 컴포넌트에서 기본 룩(zinc 팔레트·기본 radius)이 남아 있지 않다 — DESIGN.md 토큰 적용.
- [ ] 15.1 목록 외의 shadcn 컴포넌트가 `components/ui/`에 추가돼 있지 않다.

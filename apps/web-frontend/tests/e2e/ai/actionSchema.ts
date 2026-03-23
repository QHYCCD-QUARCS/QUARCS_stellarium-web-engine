export type TestIdTarget = {
  testId: string
}

export type ActionStep =
  | { kind: 'click'; target: TestIdTarget }
  | { kind: 'clickText'; text: string; exact?: boolean; withinTestId?: string }
  | { kind: 'type'; target: TestIdTarget; text: string; clear?: boolean }
  | { kind: 'selectOption'; target: TestIdTarget; value: string }
  | { kind: 'selectVSelectItemText'; target: TestIdTarget; itemText: string }
  | { kind: 'pressKey'; key: string }
  | { kind: 'waitVisible'; target: TestIdTarget; timeoutMs?: number }
  | { kind: 'waitHidden'; target: TestIdTarget; timeoutMs?: number }
  | { kind: 'waitState'; target: TestIdTarget; state: string; timeoutMs?: number }
  | { kind: 'assertVisible'; target: TestIdTarget }
  | { kind: 'assertTextContains'; target: TestIdTarget; text: string }

export type PlannerResponse =
  | { status: 'continue'; step: ActionStep; reason: string; expected?: string }
  | { status: 'done'; reason: string }
  | { status: 'fail'; reason: string }


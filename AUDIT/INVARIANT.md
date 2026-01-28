# FASS Core Invariant — Sealed

This document declares the execution invariant for the FASS Runner.

## Purpose
The core invariant defines hard, deterministic bounds on system behavior.
Any execution path that violates these bounds MUST fail before market logic runs.

## Enforced By
- `src/invariant/coreInvariant.ts`
- `src/invariant/hashGuard.ts`
- Verified at runtime via SHA-256 hash comparison

## Guarantees
- Bounded risk per trade
- Bounded trade frequency
- Bounded exposure
- Deterministic execution eligibility
- Tamper-evident startup refusal

## Hash
See `AUDIT/INVARIANT.sha256`

## Enforcement Point
- Executed at the top of `src/index.ts`
- Before adapters, schedulers, observers, or allocators

## Status
SEALED — Any modification invalidates execution.


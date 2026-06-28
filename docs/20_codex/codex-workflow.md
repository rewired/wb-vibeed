# Codex Workflow

## Rule 1: No implementation without a contract

Frontend screens must not be implemented from vague descriptions. Use the approved visual mockup and the matching screen contract.

## Rule 2: Preserve the JSON → Runtime principle

Do not bypass blueprint loading and runtime rehydration with hardcoded UI state, except inside clearly named deterministic demo adapters.

## Rule 3: No feature drift

Do not add systems outside Iteration 1 scope. If an idea seems useful but is not part of the contract, add it to the backlog instead of implementing it.

## Rule 4: Abstract values only

Do not add real-world cultivation recipes, exact plant-growing parameters, real strain names, or step-by-step growing instructions.

## Rule 5: Small, reviewable changes

Prefer small implementation steps:

1. types
2. state/read model
3. deterministic demo data
4. presentational UI
5. actions wired to simulation/facade
6. tests

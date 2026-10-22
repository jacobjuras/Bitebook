# Component Implementation Standards

Review these standards before creating or revising reusable UI components. Add a new entry whenever code-review feedback reveals a broadly reusable implementation or design lesson; record the general pattern rather than the specific edit that prompted it.

## Model finite variants explicitly

Represent a closed set of states or behaviors with an enum or similarly explicit discriminant. Pair it with a discriminated union when each variant carries different data, and handle the set exhaustively so adding a variant produces a type-checking failure until every consumer supports it.

## Resolve decisions before rendering

Move state precedence and other verbose derived calculations into pure resolver functions or view-model construction outside JSX. Render one component instance from the resolved value instead of repeating the component across disconnected conditional branches. Keep unavoidable layout branching localized to the smallest composition boundary.

## Compose test IDs from semantic prefixes

Reusable components accept a `testIDPrefix` that identifies their context and own the stable suffixes for elements they render. Parent components pass or derive prefixes; they do not construct complete child test IDs. This keeps test selectors consistent, prevents callers from depending on internal element naming, and lets nested components extend the namespace naturally.

## Keep reusable APIs minimal

Add named props only for stable structural concepts the component owns. Prefer ordinary composition for one-off or transitional content, and move feature-specific behavior into its own component when it becomes reusable. Avoid expanding a generic component API around a single caller's temporary needs.

## Prefer structured props for stable repeated layouts

When a component repeatedly renders the same kinds of child content, accept typed data describing that content instead of requiring callers to rebuild the JSX. Let the component own layout, styling, keys, and test-ID suffixes while callers remain responsible for domain-specific calculations and formatted values. Keep free-form composition only when the content genuinely varies in structure.

## Extract stable render callbacks

Move substantial item-rendering callbacks outside the parent component when they depend only on their arguments. Pass the named function to the list so the parent JSX stays declarative and the renderer avoids closing over unrelated screen state. Keep a callback inline only when it is short or genuinely requires local values.

## Prefer a canonical shared model

When related components exchange the same conceptual data, define one canonical model and pass it through unchanged. Add context-specific inputs separately rather than creating near-duplicate handoff types. Split the model only when the fields or their semantics genuinely differ; otherwise parallel types create mapping code and drift risk.

## Name types only when the name adds value

Inline small private object shapes that appear once. Introduce a named type when it is reused, exported, independently meaningful to the domain, or complex enough that naming clarifies the contract. Avoid one-use aliases that only force readers to jump elsewhere for a few obvious fields.

## Test controlled components through observable transitions

Use a small stateful harness when testing controlled interactive components. Perform the user action and assert that the rendered state changes, rather than stopping at an assertion that a callback was invoked. Callback arguments matter only when they are a distinct public contract not already proven by the resulting behavior.

## Group cohesive component inputs

When a reusable component needs many related values and callbacks, organize them into a typed model with cohesive sections instead of exposing a long flat prop list. Construct the model before rendering, keep static configuration outside the render path, and use named handlers for non-trivial behavior. The grouping should reflect generic UI concepts rather than one consumer's domain.

## Keep shared components domain-neutral

Name shared components, props, and models after the UI behavior they provide rather than the first domain that consumes them. Convert domain records into the generic model at the screen or adapter boundary so the same component can support other item types without wrappers or feature-specific branches.

## Preserve static guarantees during simplification

Removing an adapter or intermediate representation must not silently weaken exhaustiveness or validity checks. When replacing an enum-keyed record with an array, either derive the allowed type from the array or add a compile-time completeness assertion covering every enum member. Fewer lines are not an improvement if omissions can stop failing type checks.

## Keep naming changes structural

When feedback asks to generalize or rename identifiers, preserve the implementation, file boundaries, behavior, and existing type guarantees unless a refactor is explicitly requested. Do not use a naming cleanup as an opportunity to introduce adapters, split modules, or redesign data structures.

## Make generalized contracts structurally generic

A generic name does not make an abstraction reusable if its types still depend on the original domain. Define a normalized shared contract containing only the values the behavior needs, and adapt each domain model at the boundary. Do not introduce inheritance between domain entities solely to satisfy a UI abstraction.

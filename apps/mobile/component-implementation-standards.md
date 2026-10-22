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

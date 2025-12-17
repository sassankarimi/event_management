# EventManagement

This project is an Angular-based event management application created as part of an assignment.
It demonstrates a clean separation between UI, state management, and data access while
using modern Angular features.

The focus of the implementation is correctness, maintainability, and clarity rather than
maximum feature completeness.

---

## Technology Decisions

### UI Framework – Angular Material

Angular Material was chosen for the user interface components.

**Reasons:**

- Well integrated with Angular features such as reactive forms, change detection, and a11y support.
- Reduces the need for custom CSS and avoids reinventing common UI elements.
- Consistent design language and interaction patterns.

The UI components are used in a controlled way and styled where necessary to meet the
assignment requirements.

---

### State Management – Angular Signals

Angular Signals are used for state management instead of NgRx.

**Reasons:**

- Signals provide reactive updates with minimal boilerplate.
- They are sufficient for the complexity of this application.
- State changes are explicit and easy to reason about.
- No additional external dependency is required.

NgRx was intentionally not used to keep the architecture lightweight and easier to follow.
The store acts as a facade between components and services, ensuring a clear data flow.

## Persistence

Filter and sort settings are stored in `sessionStorage` because they represent
temporary UI state that is only relevant for the current browser session.

This ensures that filters and sorting remain active when the page is reloaded
during the same session, while they are intentionally cleared once the browser
is closed. Long-term persistence is not required for this type of state.

---

### Data Layer – HTTP Interceptor as Middleware

An HTTP interceptor is used as a mock backend and middleware layer.

**Reasons:**

- Allows simulation of a backend without an external server.
- Centralizes request handling, filtering, sorting, and pagination logic.
- Keeps components and services free of mock-specific logic.
- Makes it easy to switch to a real backend later.

This approach keeps the data access layer realistic while remaining self-contained.

---

### Change Detection Strategy

Components use `ChangeDetectionStrategy.OnPush`.

**Reasons:**

- Improves performance by reducing unnecessary change detection cycles.
- Works well with Signals and immutable state updates.
- Makes component updates more predictable.

---

## Project Structure Overview

- **Components**  
  Handle UI rendering and user interaction only.

- **Store (Signals-based)**  
  Manages application state, loading states, sorting, filtering, and pagination logic.

- **persistence**
  Filter and sort persistence is implemented in the central EventStore, where
  relevant state changes are synchronized with `sessionStorage`.

- **Services**  
  Responsible only for data access (HTTP communication).

- **Interceptor**  
  Acts as middleware and mock backend.

This separation ensures maintainability and testability.

---

## Development Server

To start a local development server, run:

````bash
ng serve


This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
````

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

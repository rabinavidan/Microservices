# Interview Notes

Talking points mapped to the actual code in this repo, organized the way a
"NestJS + TypeScript microservices" interview tends to move: language
features, framework/architecture patterns, distributed-systems concerns,
then cloud-native/ops. Use each section as a memory jog, not a script — be
ready to open the referenced file and walk through it.

## 1. Advanced TypeScript

- **Discriminated unions for exhaustive error handling** —
  `ServiceResult<T>` (`libs/common/src/messaging/contracts.ts`) is
  `{success:true,data:T} | {success:false,error:string}`. Every downstream
  call in `orders-service` narrows on `.success` before touching `.data`,
  so the compiler — not a runtime `if (data)` guess — enforces that errors
  are handled. This is the same shape as Rust's `Result<T,E>` and is a
  natural talking point on "how do you model failure without exceptions
  for expected outcomes."
- **Generics across a network boundary** — `sendCommand<T>()` in
  `orders-service/src/orders/orders.service.ts` is generic over the
  response payload type, so `sendCommand<ChargePaymentResult>(...)` gives
  you a typed result without runtime validation. Worth flagging the
  trade-off honestly: this is *compile-time* trust that the other service
  sends what the contract says — nothing on the wire enforces it. In a real
  system you'd pair it with runtime validation (e.g. `class-validator` on
  the receiving `@MessagePattern`, which every service in this repo does).
- **Shared contract package instead of stringly-typed messages** —
  `libs/common/src/messaging/patterns.ts` and `contracts.ts` are imported
  by every producer and consumer. A typo in a message pattern string, or a
  drifted payload shape, becomes a compile error in whichever service
  didn't update its import — not a silent runtime failure discovered in
  production.
- **Decorators & reflection metadata** — every `@Controller`, `@Injectable`,
  `@MessagePattern`, and TypeORM `@Entity`/`@Column` is a decorator reading
  and writing `reflect-metadata`. Nest's DI container resolves constructor
  parameter types from that metadata at bootstrap (`emitDecoratorMetadata`
  in `tsconfig.base.json`) — a good "how does NestJS actually wire
  dependencies" answer.
- **`strict: true` end to end** — `tsconfig.base.json` turns on
  `strictNullChecks`, `noImplicitAny`, etc. Combined with TypeORM's
  `nullable: true` columns being typed as `T | undefined` (see
  `Order.transactionId?`), the compiler forces callers to handle the
  "order not confirmed yet" case instead of assuming a value is always
  present.

## 2. NestJS & backend architecture patterns

- **API Gateway pattern** — `apps/api-gateway` is the only HTTP-facing
  service. It holds zero business logic: controllers validate input
  (`ValidationPipe` + `class-validator` DTOs) and forward to the owning
  service via `ClientProxy`. This keeps a single, versioned public contract
  even as internal services are refactored or re-partitioned.
- **Hybrid applications** — every backend service
  (`app.connectMicroservice()` + `app.listen()` in each `main.ts`) serves
  HTTP for `/health` *and* TCP for inter-service messages from one Nest
  application instance. Good for explaining how Nest decouples "transport"
  from "application logic": the same `@Controller` class can hold both
  `@Get()` and `@MessagePattern()` handlers.
- **Request/response vs. event-driven messaging** — `@MessagePattern` +
  `ClientProxy#send()` (used for `orders → inventory/payments`, both need a
  synchronous answer) vs. `@EventPattern` + `ClientProxy#emit()` (used for
  `orders → notifications`, fire-and-forget). Be ready to explain the
  `emit()` gotcha fixed in `orders.service.ts#publishEvent`: `emit()`
  returns a *cold* Observable — nothing is published until something
  subscribes to it, so the code explicitly `.subscribe()`s instead of just
  calling `.emit()` and discarding the result. This is a genuinely common
  bug in real NestJS microservice codebases.
- **Cross-cutting concerns via `APP_FILTER` / `APP_INTERCEPTOR`** —
  `AllExceptionsFilter` and `LoggingInterceptor` (`libs/common`) are
  registered globally through Nest's DI (`{provide: APP_FILTER, ...}`)
  rather than instantiated with `app.useGlobalFilters(new ...)`, so they
  can themselves receive injected dependencies later (e.g. a metrics
  client) without touching `main.ts`.
- **DTO validation at the boundary, twice** — the gateway's
  `CreateOrderDto` and orders-service's `CreateOrderDto` are separate
  classes with the same shape. The gateway validates the public contract;
  orders-service validates again because it must never trust an internal
  caller either (defense in depth — a compromised or buggy gateway
  shouldn't be able to write bad data into `orders_db`).

## 3. Distributed systems patterns

- **Orchestrated saga with compensation** —
  `OrdersService.createOrder()` is the textbook orchestration saga: step 1
  (reserve inventory) → step 2 (charge payment) → step 3 (confirm +
  notify), with an explicit compensating action
  (`compensateInventory` → `inventory.release`) if step 2 fails after step
  1 succeeded. Contrast with **choreography**, where each service would
  instead react to the previous service's published event — more
  decoupled, harder to trace, and usually only worth it once you have more
  than a couple of participants. `orders.service.spec.ts` has a unit test
  per branch of the saga (happy path, inventory failure, payment failure +
  compensation, transport failure), which is exactly what an interviewer
  asking "how would you test a saga" wants to see.
- **Idempotency** — `PaymentsService.charge()` looks up an existing
  captured payment for the same `orderId` before charging. Inter-service
  calls over TCP have no delivery guarantee stronger than "at least once"
  once you add retries/timeouts, so a saga step must be safe to replay.
- **Concurrency control** — `InventoryItem` has a `@VersionColumn()`
  (optimistic locking) and `InventoryService.reserve()` additionally takes
  a `pessimistic_write` row lock inside a transaction so two concurrent
  orders can't both reserve the last unit of the same SKU. Good prompt for
  "walk me through what happens if two requests race here."
- **Correlation IDs** — `LoggingInterceptor` stamps (or propagates) an
  `x-correlation-id` header on every gateway request and logs
  method/path/status/duration against it. It's not yet forwarded on the
  outbound `ClientProxy` calls in this repo — a natural "what would you add
  next" answer: pass it through TCP payloads or transport metadata so a
  single request can be traced across all four services' logs.
- **Health checks** — every service exposes `/health` via
  `@nestjs/terminus`, with a real `TypeOrmHealthIndicator` ping for the
  three DB-backed services. This is what a Kubernetes readiness/liveness
  probe or a load balancer health check would hit.
- **Database-per-service** — `infra/postgres-init/init-databases.sh`
  creates `orders_db`, `payments_db`, and `inventory_db` on a shared
  Postgres container (for local/demo convenience only); each service's
  `TypeOrmModule` only ever connects to its own database
  (`buildTypeOrmOptions` in `libs/common`). No service reaches into another
  service's tables — cross-service reads go through that service's API,
  same as `api-gateway` calling `inventory.findAll`.

## 4. Cloud-native / ops

- **Containerization** — every service has a multi-stage `Dockerfile`
  (build stage compiles TypeScript with `nest build`; runtime stage copies
  only `dist/` + `node_modules`). `docker-compose.yml` wires all five
  services plus Postgres together with health-check-gated `depends_on`
  (`condition: service_healthy`), so `orders-service` won't start against a
  Postgres that isn't accepting connections yet.
- **12-factor config** — every port, hostname, and DB name is read from
  environment variables via `@nestjs/config` (`.env.example` documents
  all of them), with docker-compose overriding hostnames to container
  names and local dev falling back to `localhost` defaults baked into the
  code.
- **CI** — `.github/workflows/ci.yml` installs, lints, builds, and tests
  the whole workspace on every push, plus validates `docker-compose.yml`
  with `docker compose config`.
- **Horizontal scalability** — every service is stateless (all state is in
  Postgres); nothing keeps in-memory session or request state across
  calls, so any service can be scaled by adding replicas behind the same
  TCP port without code changes.
- **What's intentionally left out for scope, and why you'd add it for
  production**: a message broker (Kafka/RabbitMQ) for true pub/sub instead
  of point-to-point TCP `emit()`; centralized structured logging/tracing
  (OpenTelemetry); a real API gateway rate limiter/auth layer; Kubernetes
  manifests (Helm chart) instead of docker-compose; and image size
  optimization in the Dockerfiles (see README's "notable design
  decisions"). Naming these unprompted signals you understand the gap
  between "demo" and "production," which is usually more valuable in an
  interview than pretending the demo is already production-grade.

## Likely questions and where the answer lives

| Question | Where to look |
|---|---|
| "Walk me through what happens when a customer places an order." | `apps/orders-service/src/orders/orders.service.ts` |
| "How do two services agree on a message shape?" | `libs/common/src/messaging/*.ts` |
| "How would you test this without spinning up all five services?" | `apps/orders-service/src/orders/orders.service.spec.ts` (mocked `ClientProxy`s) |
| "What happens if the payment service is down?" | `OrdersService.sendCommand()` — catches the transport error, returns `ServiceResult<T>` failure, saga fails the order cleanly instead of crashing |
| "How do you stop two orders from overselling the same SKU?" | `InventoryService.reserve()` — transaction + pessimistic lock + `@VersionColumn` |
| "How is this deployed?" | `docker-compose.yml`, each service's `Dockerfile`, `.github/workflows/ci.yml` |

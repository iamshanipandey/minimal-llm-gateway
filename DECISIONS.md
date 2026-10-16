1. What I Built

I built a minimal LLM Gateway using Node.js, Express.js, and MongoDB. It allows a user to send a question to an LLM through my backend instead of calling the provider directly. Each user gets a virtual API key, and the gateway checks their budget before making a provider request. Currently, I have integrated Gemini and added token usage tracking, cost calculation, budget enforcement, and request logging.


*************************************************************************************************************************************************************************************************


2. How a Request Works

The main idea is to check whether a request is allowed before spending money on an LLM API call.

Request flow :

|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
|                                                               |
|                                                               |
|           Client                                              |
|              |                                                |
|              |  Virtual key + model + question                |
|              v                                                |
|            Express Gateway                                    |
|              |                                                |
|              v                                                |
|            Validate request and virtual key                   |
|              |                                                |
|              v                                                |
|            Check user and remaining budget                    |
|              |                                                |
|              v                                                |
|            Estimate cost and reserve budget                   |
|              |                                                |
|              v                                                |
|            Call Gemini API                                    |
|              |                                                |
|              v                                                |
|            Calculate actual usage and cost                    |
|              |                                                |
|              v                                                |
|            Update user's spending and save usage log          |
|              |                                                |
|              v                                                |
|            Return response to client                          |
|                                                               |
|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||


i. The client sends a request to POST /api/v1/chat/complete with a virtual API key, the requested model, and a question.

ii. The gateway hashes the provided virtual key using SHA-256 and looks for the matching user in MongoDB. The actual virtual key is not stored as plain text in the database.

iii. After validating the user and requested model, the gateway checks the user's budget. It estimates the request cost and determines how many output tokens can be allowed within the         remaining budget.

iv. Before calling Gemini, the gateway reserves the estimated request cost in MongoDB. This helps prevent concurrent requests from spending the same remaining budget.

v. The gateway sends the question to Gemini and waits for the complete response. I chose non-streaming responses to keep the implementation simpler.

vi. After receiving the response, the gateway calculates the actual cost using token usage and the configured model pricing. It updates the user's spending, releases the reservation, and saves the request details in the usage logs.

vii. Finally, the gateway returns the answer and relevant usage information to the client.

viii. If the user has insufficient budget, the gateway rejects the request with clear reason without calling the provider.


*************************************************************************************************************************************************************************************************


3. Important Decisions and Trade-offs

Decision 1: Choosing tech stack Node.js, Express.js, and MongoDB

Options considered: A different backend framework or database could also have been used.
What I chose: Node.js and Express.js for the API, with MongoDB for user records and usage logs.
Why: This stack was familiar to me and was sufficient for the scope of the assignment. MongoDB also makes it straightforward to store users and individual request records.
Trade-off: I did not introduce additional infrastructure because the current workload and requirements do not justify it.


Decision 2: Store a hash of each virtual API key

Options considered: Store the key directly in the database or store only its hash.
What I chose: Generate a random virtual key and store its SHA-256 hash in MongoDB.
Why: The gateway needs to identify the user making a request, but it does not need to recover the original key from the database. Hashing also reduces the impact of exposing the stored key records.
Trade-off: The gateway must hash the incoming key before looking up the user. If a user loses their original key, it cannot be recovered from the stored hash.


Decision 3: Enforce budgets before calling the provider

Options considered: Check the budget only after the response or reserve an estimated cost before making the call.
What I chose: Estimate the request cost and reserve the amount before calling LLM (Gemini), then reconcile it with the actual cost.
Why: Checking only after the response could allow a user to spend more than their assigned budget. Reserving the estimated cost first helps protect the remaining balance.
Trade-off: The estimate may differ from the actual cost. Reservation and reconciliation add some complexity, but I consider this worthwhile for budget enforcement.


Decision 4: Use non-streaming responses

Options considered: Return the complete response at once or stream response chunks as they are generated.
What I chose: Non-streaming responses.
Why: My priority was to get the complete request lifecycle working, including budget checks, usage calculation, database updates, and logging. Non-streaming made this easier to implement and test.
Trade-off: The client must wait for the complete answer instead of seeing text appear gradually. Streaming could improve the perceived responsiveness, but it was not necessary for the core requirements.


Decision 5: Start with Gemini instead of multiple providers

Options considered: Integrate multiple providers immediately or start with one provider and keep model configuration separate.
What I chose: Integrate Gemini first and use a model registry for model-related configuration and pricing.
Why: One working provider was enough to demonstrate the main gateway flow without spreading the implementation across multiple provider integrations.
Trade-off: The gateway currently depends on Gemini for actual LLM responses. Supporting additional providers would require implementing and testing their individual request formats, response handling, and usage reporting.


*************************************************************************************************************************************************************************************************


4. Why Enforce Budgets at the Gateway?

I do not think the caller should be trusted to enforce its own budget.
If the budget check exists only in the client application, a caller can bypass that check and send requests directly to the API. The gateway is the point through which provider requests pass, so it is the right place to validate the key and control spending.
The gateway can reject a request before sending it to the provider. This also keeps the provider's actual API credentials on the server instead of exposing them to callers.

In short, the caller can request an LLM response, but the gateway decides whether that request is allowed within the user's budget.


*************************************************************************************************************************************************************************************************


5. What Happens When Two Requests Arrive Together?

Consider a user whose remaining budget is just enough for one request. If two requests arrive at almost the same time, a simple read-then-update approach could allow both requests to pass the budget check.

I handled this using an atomic conditional MongoDB update to reserve the estimated cost. The reservation succeeds only if the budget condition is still satisfied. This prevents two concurrent requests from independently reserving the same available balance.

I tested this scenario with five-six parallel requests. One request succeeded with HTTP 200, while the others were rejected with HTTP 402.

After a provider response, the gateway updates the actual spending and releases the reservation. If the provider call fails, the reservation is released through the error-handling path.

This is the concurrency behavior I implemented for the current assignment. It does not mean every possible failure scenario, such as a server crash during a provider call, has been fully solved.


*************************************************************************************************************************************************************************************************

6. Fallback and Failure Policy

I chose a simple fail-fast policy instead of automatically switching between multiple providers.

Currently, Gemini is the integrated provider. If a request cannot be completed, the gateway records the failure and follows its error-handling path rather than trying an unimplemented second provider.

I made this choice because adding another provider would require additional integration, error handling, and usage reconciliation. I wanted to make the core request and budget flow work correctly first.


*************************************************************************************************************************************************************************************************


7. What I Deliberately Did Not Build

I kept the scope focused on the core requirements of the assignment.

Frontend dashboard: The gateway can be tested using HTTP requests and does not need a user interface to demonstrate its functionality.

Multiple LLM providers: I started with Gemini to complete and validate one end-to-end provider integration.

Redis and queues: The current implementation uses MongoDB for its user records, reservations, and usage logs. I did not add separate infrastructure without a clear need.

Automatic provider failover: I chose a simple failure policy instead of implementing a second provider before the first integration was complete.

Complex authentication and multi-tenant permissions: The current scope focuses on virtual API keys and budget enforcement rather than a complete account-management system.

Semantic caching and model-routing optimization: These are possible future improvements, but they are not required to demonstrate the core gateway functionality.


*************************************************************************************************************************************************************************************************


8. The Decision I Am Least Confident About

The decision I am least confident about is reserving an estimated request cost before calling Gemini.

On one hand, this approach protects the budget better than checking it only after the response. It also helps handle concurrent requests because the available budget is reserved atomically.

On the other hand, the estimated cost may not exactly match the final cost. A request could reserve more than it eventually uses, and estimating input tokens and limiting output tokens adds complexity.

I still prefer reservation because preventing overspending is more important than keeping the budget calculation as simple as possible. With more time, I would improve the estimation logic, test more failure scenarios, and make reservation recovery more robust.


*************************************************************************************************************************************************************************************************


9. Where It Breaks and What I Would Do With One More Week

The current implementation demonstrates the main gateway flow, but it has limitations.

Provider availability: If Gemini is unavailable, the request may fail because there is no second provider configured.

Cost estimation: Estimated costs and actual provider usage may differ. Pricing configuration must also remain accurate for the selected model.

Unexpected server failures: A crash between reserving a budget and reconciling the actual cost could leave a reservation that needs recovery.

Operational visibility: I would improve monitoring and error reporting so that failed requests and unexpected spending behavior are easier to investigate.

With one more week, I would first focus on reliable error handling, reservation recovery, and automated tests. After those improvements, I would consider adding a second provider and a simple fallback policy.

My priority would be to make the existing gateway more reliable before expanding its scope.

1. AI Tools I Used

I used ChatGPT while working on this assignment.

I mainly used it to understand the requirements, discuss possible backend designs, review parts of my Node.js and Express.js code, debug issues, and prepare the project documentation.

I treated AI as a helper rather than blindly copying every suggestion. I reviewed the suggestions against the assignment requirements and my existing implementation before deciding what to use.


*************************************************************************************************************************************************************************************************


2. One Mistake I Caught

During the development process, some suggestions focused on adding extra infrastructure and handling many edge cases before the basic implementation was complete.

For this assignment, adding things like Redis, queues, and a multi-provider architecture would have increased the scope without being necessary for the core requirements.

I checked the assignment again and kept the implementation focused on virtual API keys, budget enforcement, Gemini integration, cost calculation, and usage logging.

This helped me avoid spending time on features that were not necessary to demonstrate the main functionality.


*************************************************************************************************************************************************************************************************


3. One Suggestion I Overrode

I chose not to expand the gateway into a complete multi-provider system at the beginning.

Supporting several providers might make the gateway more flexible, but each provider has its own API format, response structure, and usage-reporting behavior.

I decided to get one provider working end to end first. I can add more providers later without making the initial implementation unnecessarily complicated.


*************************************************************************************************************************************************************************************************


4. How I Stayed in Control

I made the final implementation decisions myself and checked how the important parts of the gateway work together.

I paid particular attention to:

How virtual API keys are generated, hashed, and matched with users.

How the remaining budget is checked before calling the provider.

How estimated costs are reserved and actual costs are reconciled.

How token usage and request details are stored in MongoDB.

How the backend handles provider failures and releases reservations.

Keeping the actual provider API key on the server rather than exposing it to callers.

I also tested the concurrent budget scenario to check whether two requests could spend the same remaining balance.

I did not consider an AI suggestion sufficient evidence that a feature worked. I relied on the implementation and testing to verify the behavior.


*************************************************************************************************************************************************************************************************


5. What I Learned

One important thing I learned was that checking a budget and updating it are not necessarily safe as separate operations.

If two requests arrive together, both might read the same remaining balance before either updates it. Using an atomic conditional database update to reserve the estimated cost helps prevent this problem.

I also learned more about how virtual API keys can be stored as hashes, how token usage can be used for cost calculation, and why the gateway should enforce budgets instead of trusting the caller.


*************************************************************************************************************************************************************************************************


6. Final Reflection

AI helped me move faster when exploring implementation options, debugging code, and organizing my thoughts. However, I still needed to understand the generated suggestions, decide which ones fit the assignment, and verify the resulting behavior.

My goal was not to build the largest possible system. It was to build a working LLM gateway, understand the trade-offs behind its design, and keep the implementation focused on the actual requirements.



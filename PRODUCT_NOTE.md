# Product note: making private access checks understandable

## The job

A developer exploring Midnight should be able to answer a simple question: can someone show they hold an approved token without publishing the token? zkPass Lite is a small way to explore that flow.

The first user is a developer considering a private eligibility check. They need to see what stays private, what becomes public, and what it takes to run a real check. A green success screen alone does not answer those questions.

## The decision

I kept the shareable web page as a local simulation and labeled it that way. It checks a sample token against a list in the browser. It does not generate a proof, submit a transaction, or protect content. The Compact contract and CLI are the path toward a real Preprod check.

This makes the concept easy to try without a wallet or proof server. The tradeoff is that the web page cannot demonstrate the claim that matters most: a proof accepted by the network. The README separates those two states so a visitor can judge the project accurately.

There is a second privacy tradeoff in the contract design. Token commitments are public. Someone can guess a weak token and compare its commitment, so a real use would need high-entropy tokens and a clear issuance plan.

## Evidence so far

- The [web demo](https://zkpass-lite.vercel.app/) is live and the local check has success and failure states.
- Compiled Compact circuit tests cover an approved token, an unapproved token, and admin-only enrollment.
- The phrase “demo token” needed clarification during review. That is a signal to test the language with someone seeing the page for the first time, not a user research result.
- No full proof has been run on Preprod for this project yet. No outside user has tested the page unaided.

## The next learning step

Ask one first-time viewer to open the demo without explanation, try a token, then describe what happened. Ask: “Did a zero knowledge proof run? What happened to the token? What would you need for a real check?” Record their words and where they hesitated.

The first pass condition is modest: they can tell that the browser checked a sample string locally and that a real proof needs the Preprod flow. If they cannot, revise the page copy and test it again. After that, run one real Preprod proof and record the time and friction from setup to confirmed access check. That would turn the project's main technical claim into observed evidence.

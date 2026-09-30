# Product note: why private access checks matter

## The job

A person trying to get access should be able to show they qualify without handing over the secret they used to qualify. The service needs an answer, not a copy of that secret. Sharing less data means there is less sensitive information for the service to expose if it is breached.

zkPass Lite explores that idea with an approved token. In the intended proof flow, the token stays with the person. Its commitment and the access result are public. A developer considering this pattern also needs to know how to implement it and where its privacy limits are. A green success screen alone does not answer either person's questions.

## The decision

I kept the shareable web page as a local simulation and labeled it that way. It checks a sample access code against a list in the browser. It does not generate a proof, submit a transaction, or protect content. The Compact contract and CLI are the path toward a real Preprod check.

This makes the concept easy to try without a wallet or proof server. The tradeoff is that the web page cannot demonstrate the claim that matters most: a proof accepted by the network. The README separates those two states so a visitor can judge the project accurately.

There is a second privacy tradeoff in the contract design. Token commitments are public. Someone can guess a weak token and compare its commitment, so a real use would need high-entropy tokens and a clear issuance plan.

## Evidence so far

- The [web demo](https://zkpass-lite.vercel.app/) is live and the local check has success and failure states.
- Compiled Compact circuit tests cover an approved token, an unapproved token, and admin-only enrollment.
- Owner review raised two gaps: “demo token” needed an explanation, and the benefit of sharing less data was not clear. These are product signals, not independent user research.
- No full proof has been run on Preprod for this project yet. No outside user has tested the page unaided.

## The next learning step

Have the owner try the revised page and record where they hesitate. Because they already know the project, follow that with one first-time viewer who opens the demo without explanation. Ask them to describe what problem it solves, what happened to the sample access code, and whether a zero knowledge proof ran. Record their words without coaching.

The first pass condition is modest: the viewer can say why sharing less data matters, that the browser checked a sample code locally, and that a real proof needs the Preprod flow. If they cannot, revise the page copy and test it again. After that, run one real Preprod proof and record the time and friction from setup to confirmed access check. That would turn the project's main technical claim into observed evidence.

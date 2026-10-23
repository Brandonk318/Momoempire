# Mind At Ease Solutions Contractor Academy — Spec

> Status: draft spec. Module learning objectives, script beats, and visual specs are **generated drafts for Brann's review**. All other sections reflect decisions already made.

## 1. Overview

Mind At Ease Solutions is a bookkeeping app for self-employed contractors (HVAC, roofing, plumbing, electrical, landscaping). The **Contractor Academy** is a free educational layer that teaches contractors how to run their business. It gets them in the door, makes them better, and creates sticking power.

**Bookkeeping is the spine. Lead gen, estimating, pricing, insurance, and hiring are the muscle around it.**

## 2. Curriculum: 15 modules

| # | Side | Module | Audio block |
|---|------|--------|-------------|
| 1 | Numbers | Reading a P&L | Soft piano · chime low C |
| 2 | Numbers | Job costing | Soft piano · chime low C |
| 3 | Numbers | Cash flow | Soft piano · chime low C |
| 4 | Numbers | Overhead rate | Soft piano · chime low C |
| 5 | Numbers | Taxes for contractors | Soft piano · chime low C |
| 6 | Business | Lead generation | Ambient pads · chime E |
| 7 | Business | Writing estimates | Ambient pads · chime E |
| 8 | Business | Setting prices | Ambient pads · chime E |
| 9 | Business | Insurance | Ambient pads · chime E |
| 10 | Business | Managing a crew / hiring subs | Ambient pads · chime E |
| 11 | Business | Invoicing and collections | Acoustic guitar · chime G |
| 12 | Business | LLC structure | Acoustic guitar · chime G |
| 13 | Business | Contracts | Acoustic guitar · chime G |
| 14 | Business | Tools and software stack | Acoustic guitar · chime G |
| 15 | Business | Scaling to first office hire | Acoustic guitar · chime G |

Each module has: **a learning objective, 4 script beats, and 3 visual specs.**

## 3. Voice style (AI voice)

- Sentences max ~15 words. Front-load the verb.
- Ellipses (`...`) for pauses.
- Strong pauses every 4-5 lines; group beats into short clusters.
- Before action steps: **"Are you ready?"** ... a beat of silence ... **"Here we go."**
- Action steps get their own section break, with extra silence before and after.
- Vary rhythm: slow down on numbers that matter, drop pace on throwaway clauses.
- Include out-loud engagement questions during clips (e.g., *"What's your truck costing you per month?"*) with a real pause for the listener to think.

## 4. Visuals

- 60-90 second clips max, one concept each.
- Pair every abstract idea with a concrete visual: pie charts, flow arrows, number counters, before/after comparisons.
- **Rule: if a sentence can't be drawn in 5 seconds, rewrite it.**
- Stock animation templates from Canva or Envato cover ~70% (pie charts, flow arrows, number counters). Custom-build only trade-specific visuals (roof cross-section, HVAC unit diagram).
- Canva is connected: it can search templates and pull file details, but it cannot render videos from a voice session.

## 5. Audio stack

Voice + light bed music + action-step chime.

| Element | Spec |
|---|---|
| Bed music level | Under -18 dB relative to voice; ducked further on numbers and key phrases |
| Modules 1-5 bed | Soft piano |
| Modules 6-10 bed | Ambient pads |
| Modules 11-15 bed | Gentle acoustic guitar |
| Tempo | Same tempo family across all three beds |
| Action-step chime | Short rising chime, 1-2 notes, ~0.5 s, played before "action step" |
| Chime pitch | Low C (piano block), E (pads block), G (guitar block) |

## 6. Voice quizzes

| Tier | What's included |
|---|---|
| Free | Video + 1 voice question per module, 3/day cap |
| Paid ($9/month) | Removes the cap; adds score tracking and an engagement dashboard |

- The voice pipeline is already proven via the WebRTC voice demo branch in this repo.
- The dashboard shows which contractors are engaging and identifies ready-to-buy contractors before they raise a hand.

## 7. Pricing

| Tier | Price | Includes | Cost profile |
|---|---|---|---|
| Free | $0 | Pre-rendered static video clips; 1 voice question per module per day | Near-zero per-view cost |
| Paid | $9/month | Uncapped voice quizzes, score tracking, dashboard | API usage funded by subscription |

**Principle:** free users don't torch the API budget; engaged users subsidize.

## 8. Referral program (existing, for context)

- Pays **25%** of what the referred paying customer pays, on every referral, including the first 3 (which also count toward a month of free access), then 25% on every referral after that.
- The 25% payout lasts **6 months per referred customer**; the clock starts when each referral comes in.
- Runs on all Mind At Ease Solutions sites plus the AI office company site.
- Eligibility: current customers in good standing only.

## 9. Chargeback / dispute / refund system

| Rule | Detail |
|---|---|
| Payout basis | Payouts trigger only on net revenue after disputes and refunds clear. Nothing is provisional. |
| Clawback | If a referred customer's payment is charged back or refunded, the referrer's 25% payout for that month is clawed back. |
| Freeze | Future payouts on that referral freeze until the dispute resolves. |
| Review threshold | **3 chargebacks in 6 months** = referrer flagged for manual review before earning anything else. |

**Why 3, not 2:** 2 would be too aggressive; it could flag a legit contractor with a dispute-prone customer base. 3 catches patterns, not coincidences. Referrers are mostly other contractors (current Mind At Ease customers), so 3 is a meaningful signal.

## 10. Module drafts (DRAFT — for Brann's review)

Each module below follows the voice style: short beats, ellipses for pauses, one engagement question, then the "Are you ready? ... Here we go." lead-in and a separated action step. Tax, insurance, and LLC content is general education, not legal or tax advice.

### Module 1: Reading a P&L

*Block: 1-5 · soft piano · chime low C*

**Learning objective:** Read a profit and loss statement and spot the three numbers that matter: revenue, gross profit, net profit.

**Script beats** *(DRAFT, for Brann's review)*

1. Open your P&L... Look at the top line. That's revenue... everything you billed.
2. Subtract job costs... materials, labor, subs. What's left is gross profit.
3. Subtract overhead next... truck, phone, insurance. That's net profit... your real pay.
4. What was your net profit last month? ... Think about it. ... Got a number?

> *[pause]*
>
> Are you ready? ... *[beat of silence]* ... Here we go.

---

**Action step:** *[chime]* Pull last month's P&L. Circle revenue, gross profit, and net profit.

---

*[extra silence]*

**Visual specs**

1. Waterfall bar: revenue drops to gross profit, then to net profit
2. Number counter ticking from $20,000 revenue down to $3,000 net
3. Before/after: messy shoebox of receipts vs. a clean one-page P&L

### Module 2: Job costing

*Block: 1-5 · soft piano · chime low C*

**Learning objective:** Track every dollar spent on a single job to know which jobs actually make money.

**Script beats** *(DRAFT, for Brann's review)*

1. Pick one job... Any job from last week.
2. Add every cost... parts, hours, permits, dump fees. Miss nothing.
3. Compare it to what you billed... That gap is your job profit.
4. Which job type makes you the most money? ... Take a second. ... Are you sure?

> *[pause]*
>
> Are you ready? ... *[beat of silence]* ... Here we go.

---

**Action step:** *[chime]* Cost out your last three jobs. Rank them by profit per hour.

---

*[extra silence]*

**Visual specs**

1. Pie chart of one job: materials, labor, subs, profit slice
2. Side-by-side job cards with profit-per-hour counters
3. Flow arrows: job ticket → costs → invoice → profit

### Module 3: Cash flow

*Block: 1-5 · soft piano · chime low C*

**Learning objective:** Separate profit from cash and forecast the next 30 days of money in and out.

**Script beats** *(DRAFT, for Brann's review)*

1. Know this... Profit is not cash. You can be profitable and broke.
2. Watch the timing... You pay for parts today. The customer pays in 30 days.
3. Map the next 30 days... money in, money out, week by week.
4. When does your bank balance hit its lowest point each month? ... Think. ...

> *[pause]*
>
> Are you ready? ... *[beat of silence]* ... Here we go.

---

**Action step:** *[chime]* List every bill and expected payment for the next four weeks.

---

*[extra silence]*

**Visual specs**

1. Bathtub animation: water in (payments) vs. drain out (bills)
2. Weekly bar chart dipping below zero in week 3
3. Calendar with flow arrows from invoice date to paid date

### Module 4: Overhead rate

*Block: 1-5 · soft piano · chime low C*

**Learning objective:** Calculate monthly overhead and the overhead cost per billable hour.

**Script beats** *(DRAFT, for Brann's review)*

1. Add up your fixed costs... truck, insurance, phone, software, rent.
2. Total them for the month... Say it's... four thousand dollars.
3. Divide by billable hours... 100 hours means... forty dollars an hour. Before you earn a cent.
4. What's your truck costing you per month? ... Payment, fuel, insurance. ... Add it up.

> *[pause]*
>
> Are you ready? ... *[beat of silence]* ... Here we go.

---

**Action step:** *[chime]* Total your monthly overhead. Divide by last month's billable hours.

---

*[extra silence]*

**Visual specs**

1. Stack of icons (truck, phone, shield) summing into a $4,000 counter
2. Division animation: $4,000 ÷ 100 hrs = $40/hr
3. Before/after hourly rate: 'what I charge' vs. 'what I keep'

### Module 5: Taxes for contractors

*Block: 1-5 · soft piano · chime low C*

**Learning objective:** Set aside money for self-employment and income tax and pay quarterly estimates on time.

**Script beats** *(DRAFT, for Brann's review)*

1. Remember this... No one withholds taxes for you. You're the employer now.
2. Self-employment tax adds about... fifteen point three percent. On top of income tax.
3. Set aside a slice of every payment... many contractors use 25 to 30 percent.
4. If the IRS sent a bill tomorrow... could you pay it? ... Be honest. ...

> *[pause]*
>
> Are you ready? ... *[beat of silence]* ... Here we go.

---

**Action step:** *[chime]* Open a separate tax savings account. Move a set percentage from every deposit.

---

*[extra silence]*

**Visual specs**

1. Pie chart: each $1,000 payment split into tax jar vs. spendable
2. Calendar with four quarterly estimate dates highlighted
3. Before/after: April panic vs. calm with a funded tax account

### Module 6: Lead generation

*Block: 6-10 · ambient pads · chime E*

**Learning objective:** Pick two lead sources, track cost per lead, and double down on what works.

**Script beats** *(DRAFT, for Brann's review)*

1. Count your leads... Where did your last ten jobs come from?
2. Track the cost... ads, listings, referrals. Divide by leads.
3. Cut the losers... Feed the winners.
4. Which lead source sent you your best customer? ... Think about it. ...

> *[pause]*
>
> Are you ready? ... *[beat of silence]* ... Here we go.

---

**Action step:** *[chime]* Tag the source of every new lead for 30 days.

---

*[extra silence]*

**Visual specs**

1. Funnel animation: ads, referrals, Google profile → leads → jobs
2. Cost-per-lead counters on three source cards
3. Before/after: scattered spending vs. two focused channels

### Module 7: Writing estimates

*Block: 6-10 · ambient pads · chime E*

**Learning objective:** Write clear, itemized estimates that win jobs and protect margin.

**Script beats** *(DRAFT, for Brann's review)*

1. Itemize everything... parts, labor, disposal, permits.
2. Show options... good, better, best. Let the customer choose.
3. Set an expiration date... Prices change. Protect yourself.
4. How many of your estimates turn into jobs? ... Out of ten? ...

> *[pause]*
>
> Are you ready? ... *[beat of silence]* ... Here we go.

---

**Action step:** *[chime]* Rewrite your last lost estimate with three options and an expiration date.

---

*[extra silence]*

**Visual specs**

1. Before/after: one-line scribbled quote vs. itemized estimate
2. Three-tier option cards (good/better/best) sliding in
3. Close-rate counter climbing from 3 of 10 to 5 of 10

### Module 8: Setting prices

*Block: 6-10 · ambient pads · chime E*

**Learning objective:** Price jobs from costs plus overhead plus target profit, not from competitors' guesses.

**Script beats** *(DRAFT, for Brann's review)*

1. Start with job cost... then add your overhead rate.
2. Add profit on top... Profit is not optional. It's how you survive slow months.
3. Check the market last... not first.
4. When did you last raise your prices? ... Think back. ...

> *[pause]*
>
> Are you ready? ... *[beat of silence]* ... Here we go.

---

**Action step:** *[chime]* Recalculate your hourly rate using cost, overhead, and a target profit.

---

*[extra silence]*

**Visual specs**

1. Stacked bar: cost + overhead + profit = price
2. Number counter: $55 → $95 per hour
3. Flow arrows from cost sheet to final price tag

### Module 9: Insurance

*Block: 6-10 · ambient pads · chime E*

**Learning objective:** Understand general liability, workers' comp, commercial auto, and tools coverage.

**Script beats** *(DRAFT, for Brann's review)*

1. Know your core four... liability, workers' comp, commercial auto, tools.
2. Liability covers damage you cause... on someone else's property.
3. Ask your agent what's excluded... The gaps are where you get hurt.
4. If a ladder fell through a customer's window today... who pays? ... Think. ...

> *[pause]*
>
> Are you ready? ... *[beat of silence]* ... Here we go.

---

**Action step:** *[chime]* Pull your policies. List each coverage and its limit on one page.

---

*[extra silence]*

**Visual specs**

1. Shield icons for four coverage types locking around a truck
2. Before/after: uninsured claim bill vs. covered claim
3. Checklist animation ticking off coverages

### Module 10: Managing a crew / hiring subs

*Block: 6-10 · ambient pads · chime E*

**Learning objective:** Decide employee vs. subcontractor, onboard properly, and keep paperwork clean.

**Script beats** *(DRAFT, for Brann's review)*

1. Know the difference... Employees follow your schedule. Subs run their own business.
2. Collect paperwork first... W-9, insurance certificate, signed agreement.
3. Set clear standards... Write down what 'done' looks like.
4. Who on your crew would you trust to run a job alone? ... Picture them. ...

> *[pause]*
>
> Are you ready? ... *[beat of silence]* ... Here we go.

---

**Action step:** *[chime]* Collect a W-9 and insurance certificate from every sub before their next job.

---

*[extra silence]*

**Visual specs**

1. Split screen: employee vs. subcontractor traits
2. Folder animation filling with W-9, COI, agreement
3. Org chart growing from owner to crew lead to helpers

### Module 11: Invoicing and collections

*Block: 11-15 · gentle acoustic guitar · chime G*

**Learning objective:** Invoice the same day, set terms, and follow up on late payments consistently.

**Script beats** *(DRAFT, for Brann's review)*

1. Invoice the same day... Every day you wait, payment slows down.
2. Set terms up front... deposits, due dates, late fees.
3. Follow up on a schedule... day 7, day 14, day 30.
4. How much money are customers holding of yours right now? ... Add it up. ...

> *[pause]*
>
> Are you ready? ... *[beat of silence]* ... Here we go.

---

**Action step:** *[chime]* Send every open invoice today. Set reminders for days 7, 14, and 30.

---

*[extra silence]*

**Visual specs**

1. Days-to-paid counter dropping from 45 to 12
2. Timeline with reminder bells at 7, 14, 30 days
3. Before/after: stack of unpaid invoices vs. paid stamp

### Module 12: LLC structure

*Block: 11-15 · gentle acoustic guitar · chime G*

**Learning objective:** Understand what an LLC does and doesn't protect, and how it affects taxes.

**Script beats** *(DRAFT, for Brann's review)*

1. Know what an LLC does... It separates business debts from personal assets.
2. Keep it separate... separate bank account, separate card.
3. Ask a tax pro about taxation... default, or S-corp election later.
4. Are your business and personal money in the same account? ... Be honest. ...

> *[pause]*
>
> Are you ready? ... *[beat of silence]* ... Here we go.

---

**Action step:** *[chime]* Open a dedicated business bank account if you don't have one.

---

*[extra silence]*

**Visual specs**

1. Wall animation separating house (personal) from truck (business)
2. Two bank cards splitting apart
3. Flow arrows: LLC → taxed as sole prop vs. S-corp (with 'ask a pro' tag)

### Module 13: Contracts

*Block: 11-15 · gentle acoustic guitar · chime G*

**Learning objective:** Use a written contract on every job covering scope, price, payment, and changes.

**Script beats** *(DRAFT, for Brann's review)*

1. Write it down... every job, every time.
2. Cover the basics... scope, price, payment schedule, timeline.
3. Add a change-order clause... Extra work means extra paperwork.
4. Have you ever done extra work and never got paid for it? ... Think. ...

> *[pause]*
>
> Are you ready? ... *[beat of silence]* ... Here we go.

---

**Action step:** *[chime]* Build a one-page contract template with a change-order clause.

---

*[extra silence]*

**Visual specs**

1. Contract page with highlighted sections popping in
2. Before/after: handshake dispute vs. signed change order
3. Flow: estimate → contract → change order → invoice

### Module 14: Tools and software stack

*Block: 11-15 · gentle acoustic guitar · chime G*

**Learning objective:** Choose a lean software stack for bookkeeping, scheduling, estimates, and payments.

**Script beats** *(DRAFT, for Brann's review)*

1. List what you use now... apps, spreadsheets, paper.
2. Cover four jobs... bookkeeping, scheduling, estimates, payments.
3. Cut overlap... One tool per job.
4. How many apps do you log into every day? ... Count them. ...

> *[pause]*
>
> Are you ready? ... *[beat of silence]* ... Here we go.

---

**Action step:** *[chime]* Audit your subscriptions. Cancel anything you haven't opened in 30 days.

---

*[extra silence]*

**Visual specs**

1. Messy app grid collapsing into four clean tiles
2. Monthly software cost counter dropping
3. Flow arrows: estimate app → invoice → books → bank

### Module 15: Scaling to first office hire

*Block: 11-15 · gentle acoustic guitar · chime G*

**Learning objective:** Know when and how to hire your first office person to free up field time.

**Script beats** *(DRAFT, for Brann's review)*

1. Track your office hours... calls, invoices, scheduling, chasing payments.
2. Price your time... What do field hours earn versus office hours?
3. Hire when the math works... and write the role down first.
4. How many hours a week do you spend on paperwork? ... Really think. ...

> *[pause]*
>
> Are you ready? ... *[beat of silence]* ... Here we go.

---

**Action step:** *[chime]* Log office tasks for one week. Total the hours.

---

*[extra silence]*

**Visual specs**

1. Clock pie: field time vs. office time
2. Before/after: owner doing everything vs. owner in field + office hire
3. Counter: hours freed × your billable rate = monthly gain

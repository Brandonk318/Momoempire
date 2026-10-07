#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

## user_problem_statement: "Add a safe country/market switcher to the AI Office platform so one engine can support multiple countries without exposing disabled markets."

## backend:
  - task: "Tenant market switching"
    implemented: true
    working: "NA"
    file: "backend/routers/tenants.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added PUT /tenants/me/country. It uppercases input, requires tenant owner/admin, validates the country against the enabled countries registry, persists tenant.country, and rejects unavailable markets."
  - task: "Enabled-market registry"
    implemented: true
    working: "NA"
    file: "backend/routers/countries.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Existing GET /countries?enabled_only=true is now the source of truth for the frontend market switcher."

## frontend:
  - task: "Dashboard market switcher"
    implemented: true
    working: "NA"
    file: "frontend/src/components/MarketSwitcher.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added market dropdown that loads enabled markets, displays country flag/code, persists selection via /tenants/me/country, and updates dashboard tenant state."
  - task: "Dashboard market switcher integration"
    implemented: true
    working: "NA"
    file: "frontend/src/components/layouts/DashboardLayout.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Wired MarketSwitcher beside LanguageSwitcher without touching main branch."

## metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 1
  run_ui: true

## test_plan:
  current_focus:
    - "Tenant market switching"
    - "Enabled-market registry"
    - "Dashboard market switcher"
    - "Dashboard market switcher integration"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

## agent_communication:
  - agent: "main"
    message: "Market expansion work is isolated on empire-market-expansion. Validate enabled-only country listing, owner country switching, rejection of disabled/unknown codes, persistence on GET /tenants/me, and dashboard dropdown behavior before merge."


## backend:
  - task: "Market-aware onboarding"
    implemented: true
    working: "NA"
    file: "backend/routers/tenants.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Onboarding now validates address.country against enabled markets, normalizes the country code, and stores it both in tenant.country and tenant.address.country."

## frontend:
  - task: "Onboarding country selector"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/Onboarding.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Onboarding now loads enabled markets and lets the business select its country instead of silently defaulting every new tenant to the U.S."


## backend:
  - task: "First three niche Office profiles"
    implemented: true
    working: "NA"
    file: "backend/niche_profiles.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added launch profiles for HVAC, plumbing, and pest control with niche office names, hero copy, CTAs, and four niche value propositions each. Industry API now exposes the profile data."

## frontend:
  - task: "Niche public storefront skins"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/PublicBusiness.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Public business pages now use the niche Office name, niche hero/tagline, niche CTA, and niche value-proposition cards for the first three launch verticals."


## frontend:
  - task: "Niche-aware onboarding preview"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/Onboarding.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Onboarding now shows the selected niche Office name, tagline, and top niche value propositions for HVAC, plumbing, and pest control."
  - task: "Niche-aware dashboard home"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/dashboard/Home.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Dashboard now fetches the tenant industry profile and shows the niche Office identity and CTA in the home experience."

## backend:
  - task: "Launch niche profile API regression coverage"
    implemented: true
    working: "NA"
    file: "backend/tests/test_phase11_market_expansion.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Expanded API tests to verify all three launch niches appear in the active industry list and keep distinct office names, taglines, CTAs, hero copy, and value propositions."

## agent_communication:
  - agent: "main"
    message: "Next validation should cover the new niche onboarding preview and dashboard card for HVAC, plumbing, and pest control, plus rerun the Phase 11 API tests for market switching and niche profile regression coverage."


## backend:
  - task: "Launch niche profile unit tests"
    implemented: true
    working: true
    file: "backend/tests/test_niche_profiles_unit.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Executed the pure niche-profile unit suite locally from the exact branch logic: 3 tests passed in 0.05s. Verified distinct launch identities, complete customer-facing fields, case-insensitive lookup, and safe unknown/empty handling."

## agent_communication:
  - agent: "main"
    message: "Niche profile unit coverage is now green (3/3). Remaining validation priority is deployed onboarding/dashboard behavior plus authenticated tenant market switching."

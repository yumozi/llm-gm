# DM Response Generation Workflow

This API endpoint generates DM responses for player actions in a TTRPG session using an LLM workflow architecture.

## File Structure

```
app/api/dm-response/
├── route.ts           # Thin API wrapper (~60 lines)
├── workflow.ts        # Main orchestrator
├── prompts.ts         # Prompt templates (configuration)
├── nodes/             # Self-contained workflow steps
│   ├── 1-input-validation.ts
│   ├── 2-data-retrieval.ts
│   ├── 3-context-assembly.ts    # Includes builder functions
│   ├── 4-prompt-construction.ts
│   ├── 5-llm-generation.ts
│   └── 6-output-persistence.ts
└── README.md
```

## Workflow Architecture

The workflow follows a clear pipeline pattern similar to LangChain/Dify workflows:

```
Input → Retrieval → Assembly → Construction → Generation → Persistence → Output
```

Each step is a discrete **node** with well-defined inputs and outputs.

## Workflow Nodes

### Node 1: Input Validation
**File:** `nodes/1-input-validation.ts`
- **Purpose:** Validates incoming request data
- **Input:** `{ sessionId?, playerMessage? }`
- **Output:** `{ sessionId, playerMessage }`
- **Errors:** Throws if required fields are missing

### Node 2: Data Retrieval
**File:** `nodes/2-data-retrieval.ts`
- **Purpose:** Fetches all necessary data from the database
- **Input:** `{ sessionId, supabase }`
- **Output:** `{ world, items, locations, abilities, organizations, taxonomies, rules, npcs, playerFields, player, messageHistory }`
- **Operations:**
  - Fetches session and world data
  - Fetches all world entities in parallel (items, locations, etc.)
  - Fetches player data
  - Fetches recent message history (last 5 messages)

### Node 3: Context Assembly
**File:** `nodes/3-context-assembly.ts`
- **Purpose:** Builds context sections from retrieved data
- **Input:** All retrieved data from Node 2
- **Output:** Individual context strings for each aspect (world, items, locations, etc.)
- **Contains:** Builder functions for each context type (self-contained)

### Node 4: Prompt Construction
**File:** `nodes/4-prompt-construction.ts`
- **Purpose:** Constructs the final LLM prompt from context sections
- **Input:** `{ contextSections, playerMessage }`
- **Output:** `{ userPrompt }`
- **Uses:** Prompt templates from `prompts.ts`

### Node 5: LLM Generation
**File:** `nodes/5-llm-generation.ts`
- **Purpose:** Calls the LLM to generate the DM response
- **Input:** `{ userPrompt, openai }`
- **Output:** `{ dmResponse }`
- **LLM Config:**
  - Model: GPT-4
  - Max tokens: 1000
  - Temperature: 0.8

### Node 6: Output Persistence
**File:** `nodes/6-output-persistence.ts`
- **Purpose:** Saves the DM response to the database
- **Input:** `{ sessionId, dmResponse, supabase }`
- **Output:** `{ dmResponse, messageId }`
- **Note:** Returns response even if save fails

## Supporting Files

### `workflow.ts`
The main orchestrator that chains all nodes together. Each node is called sequentially with the output of the previous node.

### `prompts.ts`
Contains all prompt templates and constants (configuration, not logic):
- `SYSTEM_PROMPT`: System message for the LLM
- `DM_GUIDELINES`: Detailed instructions for DM behavior
- Header constants for each context section (e.g., `WORLD_SETTING_HEADER`, `ITEMS_HEADER`)

### `route.ts`
The Next.js API route handler. Acts as a thin wrapper around the workflow (~60 lines):
1. Parses request
2. Initializes Supabase client
3. Calls `executeDMResponseWorkflow()`
4. Returns response with proper error handling

## Workflow Execution

```typescript
// In route.ts
const result = await executeDMResponseWorkflow({
  sessionId,
  playerMessage,
  supabase,
  openai,
})
```

The workflow executes as follows:

```typescript
// In workflow.ts
validatedInput = validateInput({ sessionId, playerMessage })
  ↓
retrievedData = retrieveData({ sessionId, supabase })
  ↓
contextSections = assembleContext(retrievedData)
  ↓
{ userPrompt } = constructPrompt({ contextSections, playerMessage })
  ↓
{ dmResponse } = generateResponse({ userPrompt, openai })
  ↓
output = persistOutput({ sessionId, dmResponse, supabase })
  ↓
return output
```

## Benefits of This Architecture

1. **Clear Flow:** Easy to understand the data flow from start to finish
2. **Modularity:** Each node is independent and can be modified separately
3. **Testability:** Each node can be tested in isolation
4. **Maintainability:** Changes to one step don't affect others
5. **Debugging:** Easy to add logging/monitoring at each step
6. **Extensibility:** New nodes can be added to the pipeline easily
7. **LLM-First Design:** Structure matches LLM workflow tools (LangChain, Dify)

## Future Enhancements

Potential improvements to the workflow:

- Add a **pre-processing node** to filter/rank relevant context
- Add a **post-processing node** to format/validate output
- Add **branching logic** for different types of player actions
- Add **caching layer** for frequently accessed data
- Add **retry logic** with exponential backoff for LLM calls
- Add **streaming support** for real-time response generation
- Add **monitoring/observability** hooks at each node

# discuss-with-gemini

Use Gemini CLI to conduct in-depth discussions about current work, enhancing Claude Code's accuracy through multi-perspective analysis and iterative refinement.

## Prerequisites
Before using this command, ensure:
- Gemini CLI is installed (`gemini` command available)
- Authenticated via `gcloud auth application-default login`

## Execution Steps

1. **Gather Current Context**
   First, I'll collect information about your current work:
   ```bash
   # Check Git status and recent changes
   !git status --porcelain
   !git diff --cached
   !git diff
   !git log --oneline -10
   ```

2. **Prepare Discussion Topics**
   Based on the context, I'll prepare discussion points covering:
   - Architecture and design patterns
   - Performance and scalability
   - Maintainability and code quality
   - Security considerations
   - Best practices alignment

3. **Initiate Gemini Discussion**
   I'll create a comprehensive prompt and start the discussion:
   ```bash
   # Create temporary file with context and questions
   !echo "[Discussion prompt will be here]" > /tmp/gemini_discussion.md

   # Start interactive discussion with Gemini
   !gemini -p < /tmp/gemini_discussion.md
   ```

4. **Iterative Refinement**
   Based on Gemini's initial response, I'll:
   - Identify areas needing deeper analysis
   - Formulate follow-up questions
   - Continue the discussion for 3-5 rounds

   Each round will explore:
   - Alternative approaches and trade-offs
   - Implementation specifics with code examples
   - Potential risks and edge cases
   - Priority recommendations

5. **Generate Action Plan**
   After the discussion rounds, I'll synthesize an actionable plan:
   - Immediate implementation items (High priority)
   - Short-term improvements (Medium priority)
   - Long-term considerations (Low priority)
   - Implementation guidelines and anti-patterns to avoid

6. **Save Discussion Log**
   The complete discussion will be saved for future reference:
   ```bash
   # Create discussion log directory if needed
   !mkdir -p .claude/discussion_logs

   # Save timestamped log
   !echo "[Discussion content]" > .claude/discussion_logs/gemini_discussion_$(date +%Y%m%d_%H%M%S).md
   ```

## Usage Examples

### Basic Discussion
```
/p-discuss-with-gemini
```
Analyzes current Git changes and work context

### Specific Topic Discussion
```
/p-discuss-with-gemini GraphQL schema optimization
```
Focuses discussion on a particular area

### File-Specific Analysis
```
/p-discuss-with-gemini Review the implementation in backend/apps/cotomu/domain/usecases/file_operations.go
```
Analyzes a specific file with Gemini's insights

### Deep Analysis Mode
```
/p-discuss-with-gemini --deep Performance optimization for large file uploads
```
Conducts 5 rounds of discussion instead of the default 3

## Additional Instructions
$ARGUMENTS

## Expected Outcomes
- Deeper understanding of code quality issues
- Concrete improvement suggestions with examples
- Prioritized action items for implementation
- Documentation of architectural decisions
- Early detection of potential problems

## Notes
- The discussion will be conducted entirely in English for optimal AI interaction
- Each discussion round builds upon previous insights
- The final action plan will include specific code examples where applicable
- All discussions are logged for future reference and decision tracking

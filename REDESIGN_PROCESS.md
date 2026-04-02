# Redesign process (LineCrew)

You do **not** need to run developer commands yourself. The AI assistant is expected to run automated checks after meaningful code work.

## After each Claude prompt that changes code

The assistant should run, in order:

1. **`npx tsc --noEmit`** — TypeScript check  
2. **`npm run lint`** — ESLint  
3. **`npx next build`** — production build (catches Next.js issues `tsc` alone can miss)

If the build fails on Windows with a permission error on `.next`, the assistant may delete the `.next` folder and rebuild once.

## What you do

- Describe what you want in the next prompt.  
- Manually try critical flows in the browser when the assistant suggests it (sign-in, booking, payments in test mode, etc.).

## Cursor

Persistent instructions for the AI live in **`.cursor/rules/`**, including **`claude-prompt-verification.mdc`**.

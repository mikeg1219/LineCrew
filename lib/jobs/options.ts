
export const LINE_TYPES = [
  "General Boarding",
  "Check-In",
  "Bag Drop",
  "TSA PreCheck",
] as const;
export type LineType = (typeof LINE_TYPES)[number];
export const ESTIMATED_WAIT_OPTIONS = [
  "15 min",
  "30 min",
  "45 min",
  "1 hour",
  "1.5 hours",
  "2+ hours",
] as const;
export type EstimatedWait = (typeof ESTIMATED_WAIT_OPTIONS)[number];
```

Save with `Ctrl+S`, then:
```
git add .
git commit -m "update line types - remove customs, rename security"
git push origin main
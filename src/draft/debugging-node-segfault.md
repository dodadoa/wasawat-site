---
title: Debugging segfault(SIGSEGV) in Node.js
layout: ../../../layouts/blogLayout.astro
# preview: /images/blogs/tech-radar-preview.png
---

To debug segfault in nodejs (and later in time, memory leak), there is handy tools to help you.

First, the library `SegfaultHandler`.
If not enough we can explore the `core dump` using `llnode` (library that is on top `lldb`).



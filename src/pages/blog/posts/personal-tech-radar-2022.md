---
title: Summary of my personal tech-radar of 2022
layout: ../../../layouts/blogLayout.astro
---

[Link to tech-radar](../../../../tech-radar)

# Backend

- I'm becoming more convinced to not use ORM much in the project while most of my friends are big fans. Ofc, it's handy and
in the very beginning can provide lots of convenient stuff like querying, and generating data models, but later in terms of maintenance it's becoming more burden to sync all of the stuff and you still have to use raw SQL (or SQL builder anyway) if things getting more complex especially if your main job is to transfer data. I will go with SQL builder instead (ex. `SQLx`), but if the application is medium size, then ORM still pretty handy anyway; `Prisma` is my choice when working with `node` and `SeaORM` is my choice when working with `Rust`. I'm ok with `Diesel` though since lately they provide the async solution as well via spawning the new thread, but I prefer native async solution.

- 

# Frontend

- I put `redux at the beginning of the project` to avoid, since in most of the projects I used there is no need for redux, normally what we want is simple state management with a moderate side effect, which in my opinion, redux is too big for most of my job. Simply put, the `react-context` or `Jotai` would be enough. If I need some side-effect handling, which most of my time involves around the network call, I will use the `react-query` or `react-swr`.

- I've just tried the `Astro` and love its flexibility.


# Infrastructure

- In the next 3-5 years, I think `eBPF` and `io_uring` will be adopted aggressively, so I should learn about it and
thus include this on my radar as a trial. For `io_uring`, it seems at this time, a very progressive feature for kernel in this recent year, it will become an `async` API for the next generation for sure (since it is not only for async harddisk API anymore, it is now the general async for kernel).

# Languages

- This year, I have to learn `elixir`. Comparing to `rust` I'd say that I like it less, due to my preferences on type langauge
and how compiler save my time, and how it's easy to debug on concurrency (but ofc, imo, `rust` is harder to write concurrency )

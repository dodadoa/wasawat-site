---
title: Summary of my personal tech-radar of 2022
layout: ../../../layouts/BlogLayout.astro
---

[Link to tech-radar](../../../../tech-radar)

# Frontend

- I put redux as avoid, since most of project I used there is no need for redux, normally what we want
is simple state management with moderate side effect, which in my opinion, redux is too big for most of 
my job. Simply put, the react-context or Jotai would be enough. If I need some side-effect handling, which
most of my time involving around the network call, I will use the react-query or react-swr.
- I am no longer write class in React, given I am not a fan of react-hook. I just don't like more on the javascript's class.
- I come back to write more on frontend half of the year and quite amazing how ecosystem of react is growing with this big 
comparing to back there at 2018-2020. It seems I enjoy working with Jotai, similar to react's context but more simple way on
its usecase.


# Infrastructure

- 
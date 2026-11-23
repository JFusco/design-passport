"use client";

import { useEffect } from "react";

const contentSelector = [
  "main > *", ".hero > *", ".metrics > *", ".journeys > *",
  ".delivery-card > *", ".form-card form > *", ".import-results li",
  ".history-list > li", ".history-findings > li", ".review-workspace > *",
  ".queue-list > *", ".review-body > *", ".decision-panel > *",
  ".model-review-content > *", ".model-run > *", ".model-recommendation",
].join(", ");

export function ContentMotion() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const revealed = new WeakSet<Element>();
    const animations = new Map<Element, Animation>();
    const tokens = getComputedStyle(document.documentElement);
    const storyOffset = tokens.getPropertyValue("--story-offset").trim();
    const easing = tokens.getPropertyValue("--ease-story").trim();
    const duration = parseFloat(tokens.getPropertyValue("--duration-story"));
    const landingDuration = parseFloat(tokens.getPropertyValue("--duration-landing"));
    const staggerStep = parseFloat(tokens.getPropertyValue("--story-stagger"));
    const staggerLimit = parseFloat(tokens.getPropertyValue("--story-stagger-limit"));

    function stopAnimation(target: Element) {
      animations.get(target)?.cancel();
      animations.delete(target);
    }

    function keepFocusVisible(event: FocusEvent) {
      for (const target of animations.keys()) {
        if (event.target instanceof Node && target.contains(event.target)) stopAnimation(target);
      }
    }

    function stopForReducedMotion() {
      if (reducedMotion.matches) {
        for (const target of animations.keys()) stopAnimation(target);
      }
    }
    const visibility = new IntersectionObserver((entries) => {
      let stagger = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
        const target = entry.target;
        visibility.unobserve(target);
        revealed.add(target);
        if (reducedMotion.matches || target.contains(document.activeElement)) continue;

        const animation = target.animate([
          { opacity: 0.15, transform: `translateY(${storyOffset})` },
          { opacity: 1, transform: "none" },
        ], {
          duration: target.classList.contains("hero") ? landingDuration : duration,
          delay: Math.min(stagger * staggerStep, staggerLimit),
          easing,
          fill: "backwards",
        });
        animations.set(target, animation);
        animation.onfinish = () => animations.delete(target);
        stagger += 1;
      }
    });

    function observe(node: Element) {
      const targets = [...node.querySelectorAll(contentSelector)];
      if (node.matches(contentSelector)) targets.unshift(node);
      for (const target of targets) {
        if (!revealed.has(target) && !target.closest(".loading-screen")) visibility.observe(target);
      }
    }

    const updates = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.removedNodes) {
          if (!(node instanceof Element)) continue;
          visibility.unobserve(node);
          stopAnimation(node);
          for (const target of node.querySelectorAll(contentSelector)) {
            visibility.unobserve(target);
            stopAnimation(target);
          }
        }
        for (const node of record.addedNodes) {
          if (node instanceof Element) observe(node);
        }
      }
    });
    updates.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("focusin", keepFocusVisible);
    reducedMotion.addEventListener("change", stopForReducedMotion);
    observe(document.body);
    return () => {
      updates.disconnect();
      visibility.disconnect();
      document.removeEventListener("focusin", keepFocusVisible);
      reducedMotion.removeEventListener("change", stopForReducedMotion);
      for (const target of animations.keys()) stopAnimation(target);
    };
  }, []);

  return null;
}

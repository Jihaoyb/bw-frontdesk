import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { CenterInfo } from "@/components/center-info";
import { PerspectiveNav } from "@/components/perspective-nav";
import { centerConfig } from "@/lib/center-config";

const strip = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");

describe("center configuration copy", () => {
  it("shows office hours and the contact fallback without implying live availability or a reply deadline", () => {
    const text = strip(renderToStaticMarkup(createElement(CenterInfo)));
    expect(text).toContain(centerConfig.careHours);
    expect(text).toContain(centerConfig.officeHours);
    expect(text).toContain(centerConfig.contactPhone);
    expect(text).toContain(centerConfig.contactEmail);
    expect(text).not.toMatch(/online now|available now|right away|immediately|within \d+|reply by|respond by|guarantee|live chat/i);
  });

  it("describes the perspective switch as a demo convenience, not authentication", () => {
    const text = strip(renderToStaticMarkup(createElement(PerspectiveNav, { active: "parent" })));
    expect(text).toMatch(/demo convenience/i);
    expect(text).toMatch(/not a login/i);
    expect(text).not.toMatch(/sign in|log in|password/i);
  });
});

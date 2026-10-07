import { describe, expect, it } from "vitest";
import { idiomaDeCookies } from "./index";

describe("idiomaDeCookies", () => {
  it("lee la cookie idioma entre otras y usa español por defecto", () => {
    expect(idiomaDeCookies("sb-token=abc; idioma=en; otra=2")).toBe("en");
    expect(idiomaDeCookies("idioma=es")).toBe("es");
    expect(idiomaDeCookies("idioma=fr")).toBe("es");
    expect(idiomaDeCookies("otra=1")).toBe("es");
    expect(idiomaDeCookies(null)).toBe("es");
  });
});

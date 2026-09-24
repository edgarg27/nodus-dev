import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ErrorPage from "../../src/app/(app)/error.tsx";

describe("boundary del segmento (app)", () => {
  it("muestra el mensaje genérico, role=alert y Reintentar, sin filtrar el error interno", () => {
    const html = renderToString(
      createElement(ErrorPage, { error: new Error("x"), reset: () => {} }),
    );

    expect(html).toContain("Algo salió mal");
    expect(html).toContain('role="alert"');
    expect(html).toContain("Reintentar");
    expect(html).not.toContain("x");
  });
});

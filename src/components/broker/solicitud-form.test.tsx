// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const { SolicitudForm } = await import("./solicitud-form");
const { IdiomaProvider } = await import("../i18n/idioma-provider");

const fetchMock = vi.fn();

function renderizar() {
  vi.stubGlobal("fetch", fetchMock);
  render(<SolicitudForm nombre="Ana Pérez" correo="ana@example.com" />);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("SolicitudForm", () => {
  it("muestra nombre y correo en solo lectura, sin inputs para ellos", () => {
    renderizar();

    expect(screen.getByText("Ana Pérez")).toBeTruthy();
    expect(screen.getByText("ana@example.com")).toBeTruthy();
    expect(screen.queryByDisplayValue("Ana Pérez")).toBeNull();
    expect(screen.queryByDisplayValue("ana@example.com")).toBeNull();
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  it("sin empresa muestra el error de validación y no envía el POST", async () => {
    renderizar();

    await userEvent.type(screen.getByLabelText("Nota para el equipo de Nodus"), "Hola");
    await userEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    expect((await screen.findByText("La empresa es obligatoria")).getAttribute("role")).toBe(
      "alert",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("con empresa y mensaje envía { mensaje, empresa } y reemplaza el formulario por la vista de éxito", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: "1", estado: "pendiente" } }), { status: 201 }),
    );
    renderizar();

    await userEvent.type(screen.getByLabelText("Empresa"), "Inmobiliaria Norte");
    await userEvent.type(
      screen.getByLabelText("Nota para el equipo de Nodus"),
      "Quiero ser broker",
    );
    await userEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    expect(await screen.findByRole("heading", { name: "Tu solicitud fue enviada" })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/broker-requests");
    expect(JSON.parse(init.body as string)).toEqual({
      mensaje: "Quiero ser broker",
      empresa: "Inmobiliaria Norte",
    });
    expect(screen.queryByRole("button", { name: "Enviar solicitud" })).toBeNull();
  });

  it("la vista de éxito enlaza a /propiedades y a /", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: {} }), { status: 201 }));
    renderizar();

    await userEvent.type(screen.getByLabelText("Empresa"), "Inmobiliaria Norte");
    await userEvent.type(screen.getByLabelText("Nota para el equipo de Nodus"), "Hola");
    await userEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    const publicaciones = await screen.findByRole("link", { name: "Volver a mis publicaciones" });
    const inicio = screen.getByRole("link", { name: "Volver al inicio" });
    expect(publicaciones.getAttribute("href")).toBe("/propiedades");
    expect(inicio.getAttribute("href")).toBe("/");
  });
});

describe("SolicitudForm en inglés", () => {
  it("muestra etiquetas, botón y mensajes de validación en inglés", async () => {
    vi.stubGlobal("fetch", fetchMock);
    render(
      <IdiomaProvider idioma="en">
        <SolicitudForm nombre="Ana Pérez" correo="ana@example.com" />
      </IdiomaProvider>,
    );

    expect(screen.getByText("Name")).toBeTruthy();
    await userEvent.type(screen.getByLabelText("Note for the Nodus team"), "Hello");
    await userEvent.click(screen.getByRole("button", { name: "Submit application" }));

    expect(await screen.findByText("Company is required")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

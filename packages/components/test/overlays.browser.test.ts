import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { confirm, toast } from "../src/index.ts";
import { $, mount, settle } from "./helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

const inner = (el: Element) => el.shadowRoot!.querySelector("dialog") as HTMLDialogElement;

describe("st-dialog", () => {
  it("opens modally, focuses the first control, and closes on Escape", async () => {
    const root = await mount(`
      <st-dialog heading="Export">
        <st-text-field label="File name"></st-text-field>
        <st-button slot="footer">Cancel</st-button>
      </st-dialog>`);
    const dialog = $(root, "st-dialog");
    const onOpen = vi.fn();
    dialog.addEventListener("openchange", (e) => onOpen((e as CustomEvent).detail.open));
    dialog.open = true;
    await settle(root);
    expect(inner(dialog).open).toBe(true);
    expect(inner(dialog).matches(":modal")).toBe(true);
    expect(document.activeElement).toBe($(root, "st-text-field"));
    await userEvent.keyboard("{Escape}");
    await settle(root);
    expect(dialog.open).toBe(false);
    expect(onOpen).toHaveBeenCalledWith(false);
  });

  it("stays open on Escape when persistent", async () => {
    const root = await mount(`<st-dialog heading="Saving" persistent open><p>…</p></st-dialog>`);
    await userEvent.keyboard("{Escape}");
    await settle(root);
    expect(inner($(root, "st-dialog")).open).toBe(true);
  });

  it("hides the footer when empty", async () => {
    const root = await mount(`<st-dialog heading="Info" open>Hello</st-dialog>`);
    const footer = $(root, "st-dialog").shadowRoot!.querySelector("footer")!;
    expect(getComputedStyle(footer).display).toBe("none");
  });
});

describe("confirm()", () => {
  it("resolves true on confirm and false on cancel", async () => {
    const yes = confirm({ heading: "Delete?", confirmLabel: "Delete", tone: "danger" });
    await settle();
    let el = document.querySelector("st-alert-dialog")!;
    const buttons = el.shadowRoot!.querySelectorAll("st-button");
    expect(buttons[1]!.textContent).toBe("Delete");
    expect(buttons[1]!.getAttribute("tone")).toBe("danger");
    await vi.waitFor(() => expect(el.shadowRoot!.activeElement ?? document.activeElement).toBeTruthy());
    (buttons[1] as HTMLElement).click();
    expect(await yes).toBe(true);
    expect(document.querySelector("st-alert-dialog")).toBeNull();

    const no = confirm({ heading: "Discard?" });
    await settle();
    el = document.querySelector("st-alert-dialog")!;
    await userEvent.keyboard("{Escape}");
    expect(await no).toBe(false);
  });
});

describe("toast()", () => {
  it("shows a toast in the toaster and auto-dismisses", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const onAction = vi.fn();
    toast("Exported 3 frames", {
      tone: "success",
      duration: 1000,
      action: { label: "Show", onClick: onAction },
    });
    await settle();
    const toaster = document.querySelector("st-toaster")!;
    expect(toaster.matches(":popover-open")).toBe(true);
    const el = toaster.querySelector("st-toast")!;
    expect(el.textContent).toBe("Exported 3 frames");
    expect(el.getAttribute("role")).toBe("status");
    vi.advanceTimersByTime(1200);
    expect(toaster.querySelector("st-toast")).toBeNull();
    vi.useRealTimers();
  });

  it("runs the action", async () => {
    const onAction = vi.fn();
    toast("Layer deleted", { duration: 0, action: { label: "Undo", onClick: onAction } });
    await settle();
    const el = document.querySelector("st-toast")!;
    (el.shadowRoot!.querySelector(".action") as HTMLElement).click();
    expect(onAction).toHaveBeenCalled();
  });
});

describe("st-progress / st-spinner", () => {
  it("renders value and indeterminate states", async () => {
    const root = await mount(
      `<st-progress label="Export" value="40" style="width:200px"></st-progress><st-progress></st-progress><st-spinner></st-spinner>`,
    );
    const [known, unknown] = root.querySelectorAll("st-progress");
    const fill = known!.shadowRoot!.querySelector(".fill") as HTMLElement;
    expect(Math.round(fill.getBoundingClientRect().width)).toBe(80);
    expect(unknown!.hasAttribute("data-indeterminate")).toBe(true);
    expect($(root, "st-spinner").getBoundingClientRect().width).toBe(16);
  });
});

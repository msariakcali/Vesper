import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentModel, Overlay } from "../core/model/types";
import { useDocumentStore } from "./documentStore";

vi.mock("../core/render/pdfjs", () => ({
  readPageCount: vi.fn(),
  releasePdfDocument: vi.fn(),
}));

vi.mock("../core/render/thumbnailCache", () => ({
  evictSource: vi.fn(),
}));

function modelWithTwoPages(overlays: Overlay[] = []): DocumentModel {
  return {
    sources: {},
    pages: [
      { id: "page-1", sourceId: "source", sourceIndex: 0, rotation: 0, overlays: [...overlays] },
      { id: "page-2", sourceId: "source", sourceIndex: 1, rotation: 0, overlays: [] },
    ],
  };
}

const watermark: Overlay = {
  id: "watermark-1",
  tool: "watermark",
  kind: "text",
  text: "GİZLİ",
  x: 0.3,
  y: 0.5,
  size: 42,
  color: "#991b1b",
  opacity: 0.2,
  rotate: -35,
};

beforeEach(() => {
  useDocumentStore.setState({
    model: modelWithTwoPages(),
    past: [],
    future: [],
    dirty: false,
  });
});

describe("overlay history and removal", () => {
  it("adds a multi-page watermark as one undoable operation", () => {
    const store = useDocumentStore.getState();
    store.addOverlay(["page-1", "page-2"], watermark);

    const added = useDocumentStore.getState().model.pages.flatMap((page) => page.overlays);
    expect(added).toHaveLength(2);
    expect(new Set(added.map((overlay) => overlay.id)).size).toBe(2);
    expect(new Set(added.map((overlay) => overlay.groupId)).size).toBe(1);

    useDocumentStore.getState().undo();
    expect(useDocumentStore.getState().model.pages.every((page) => page.overlays.length === 0)).toBe(true);
  });

  it("removes one or all tool items and restores them with undo", () => {
    useDocumentStore.setState({ model: modelWithTwoPages([watermark]) });

    useDocumentStore.getState().removeOverlay("page-1", watermark.id);
    expect(useDocumentStore.getState().model.pages[0]?.overlays).toHaveLength(0);
    useDocumentStore.getState().undo();
    expect(useDocumentStore.getState().model.pages[0]?.overlays).toHaveLength(1);

    useDocumentStore.getState().removeOverlaysByTool("watermark");
    expect(useDocumentStore.getState().model.pages[0]?.overlays).toHaveLength(0);
    useDocumentStore.getState().undo();
    expect(useDocumentStore.getState().model.pages[0]?.overlays[0]?.tool).toBe("watermark");
  });

  it("edits one item or its whole application group as an undoable operation", () => {
    useDocumentStore.getState().addOverlay(["page-1", "page-2"], watermark);
    const [firstPage, secondPage] = useDocumentStore.getState().model.pages;
    const first = firstPage?.overlays[0];
    const second = secondPage?.overlays[0];
    expect(first?.groupId).toBeTruthy();

    useDocumentStore.getState().updateOverlay("page-1", first!.id, { size: 72, color: "#ff0000" });
    expect(useDocumentStore.getState().model.pages[0]?.overlays[0]).toMatchObject({ size: 72, color: "#ff0000" });
    expect(useDocumentStore.getState().model.pages[1]?.overlays[0]).toMatchObject({ size: 42 });
    useDocumentStore.getState().undo();

    useDocumentStore.getState().updateOverlayGroup(second!.groupId!, { opacity: 0.65, rotate: 15 });
    expect(useDocumentStore.getState().model.pages.flatMap((page) => page.overlays)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ opacity: 0.65, rotate: 15 }),
        expect.objectContaining({ opacity: 0.65, rotate: 15 }),
      ]),
    );
    useDocumentStore.getState().undo();
    expect(useDocumentStore.getState().model.pages.flatMap((page) => page.overlays)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ opacity: 0.2, rotate: -35 }),
        expect.objectContaining({ opacity: 0.2, rotate: -35 }),
      ]),
    );
  });
});

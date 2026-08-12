import { useCallback } from "react";
import { useDocumentStore } from "../store/documentStore";

export function useInsertAt() {
  const addSources = useDocumentStore((state) => state.addSources);
  const movePagesTo = useDocumentStore((state) => state.movePagesTo);

  return useCallback(
    async (bytes: Uint8Array, name: string, atIndex: number) => {
      const before = new Set(useDocumentStore.getState().model.pages.map((page) => page.id));
      const result = await addSources([{ name, bytes }]);
      if (result.errors.length > 0) throw new Error(result.errors.join("\n"));
      const after = useDocumentStore.getState().model.pages;
      const newIds = after.filter((page) => !before.has(page.id)).map((page) => page.id);
      if (newIds.length > 0) movePagesTo(newIds, atIndex);
      return newIds.length;
    },
    [addSources, movePagesTo],
  );
}

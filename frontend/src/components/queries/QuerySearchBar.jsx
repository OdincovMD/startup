import React from "react";
import { ListingSearchBar } from "../listing";

export function QuerySearchBar(props) {
  return (
    <ListingSearchBar
      {...props}
      placeholder="Название, описание, организация…"
      ariaLabel="Поиск по запросам"
      suggestionsId="query-suggestions-list"
      dataSuggestionsAttr="data-query-suggestions"
    />
  );
}

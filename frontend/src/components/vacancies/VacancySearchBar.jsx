import React from "react";
import { ListingSearchBar } from "../listing";

export function VacancySearchBar(props) {
  return (
    <ListingSearchBar
      {...props}
      placeholder="Название, навыки, лаборатория…"
      ariaLabel="Поиск по вакансиям"
      suggestionsId="vacancy-suggestions-list"
      dataSuggestionsAttr="data-vacancy-suggestions"
    />
  );
}

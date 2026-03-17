import { useState, useCallback } from "react";

export function useVacancyFilters() {
  const [employmentType, setEmploymentType] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [laboratoryId, setLaboratoryId] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState("date_desc");

  const hasFilters = employmentType || organizationId || laboratoryId;

  const resetFilters = useCallback(() => {
    setEmploymentType("");
    setOrganizationId("");
    setLaboratoryId("");
    setSortBy("date_desc");
  }, []);

  const getActiveFilterCount = useCallback(() => {
    return [employmentType, organizationId, laboratoryId].filter(Boolean).length;
  }, [employmentType, organizationId, laboratoryId]);

  return {
    employmentType,
    setEmploymentType,
    organizationId,
    setOrganizationId,
    laboratoryId,
    setLaboratoryId,
    filtersOpen,
    setFiltersOpen,
    sortBy,
    setSortBy,
    hasFilters,
    resetFilters,
    getActiveFilterCount,
  };
}

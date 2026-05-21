import { getCustomerFilterLayoutClasses } from "./customer-filter-layout";

export function CustomerFilterHeader({ filters, active, setActive, search, setSearch, placeholder = "Search..." }) {
  const layout = getCustomerFilterLayoutClasses();

  return (
    <div className={`co-filter-bar co-customer-filter-bar ${layout.header}`}>
      <div className={layout.pillsRow}>
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActive(filter)}
            className={`rounded-lg px-3 py-2 text-xs font-black ${active === filter ? "bg-blue-700 text-white shadow-sm shadow-blue-700/20" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-orange-50 hover:text-orange-700 hover:ring-orange-200"}`}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className={layout.searchRow}>
        <input className={layout.searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder} />
      </div>
    </div>
  );
}

import React, { useState } from "react";
import {
    useReactTable,
    createColumnHelper,
    getCoreRowModel,
    flexRender,
    getPaginationRowModel,
    ColumnFiltersState,
    getFilteredRowModel,
    getSortedRowModel,
    SortingState,
    Column,
    Table,
    getFacetedUniqueValues,
    CellContext,
} from "@tanstack/react-table";
import "bootstrap/dist/css/bootstrap.css";
import getConfig from "next/config";
const { publicRuntimeConfig } = getConfig();

interface Reg {
    ["分類"]: string,
    ["No"]: string,
    ["法令名"]: string,
    ["所管省庁名"]: string,
    ["条項"]: string,
    ["規制等の内容概要"]: string,
    ["規制等の類型"]: string,
    ["現在Phase"]: string,
    ["見直後Phase"]: string,
    ["見直し要否"]: string,
    ["見直し完了時期"]: string,
    ["工程表"]: string,
    ["見直しの概要"]: string,
    LawId: string,
    LawTitle: string,
    LawNum: string,
    sp: string,
    a: string,
    p: string,
    i: string,
    AppdxTable: string,
}

interface SchedHeadItem {
    col: number,
    year: string,
    month: string,
}

type SchedHead = SchedHeadItem[];

interface SchedItem {
    name: string,
    startCol: number,
    endCol: number,
}

interface SchedGroup {
    name: string,
    items: SchedItem[],
}

type SchedGroups = Record<string, SchedGroup>;

interface Sched {
    head: SchedHead,
    groups: SchedGroups,
}

type ClauseLinkSite = "Lawtext" | "e-Gov";

const columnHelper = createColumnHelper<Reg>();
declare module "@tanstack/react-table" {
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unnecessary-type-constraint, @typescript-eslint/no-unused-vars
    interface TableMeta<TData extends unknown> {
        clauseLinkSite: ClauseLinkSite;
        sched: Sched;
    }
}

const getClauseLink = (reg: Reg, site: ClauseLinkSite): string | null => {
    if (!reg.LawId) return null;
    if (site === "Lawtext") {
        const fragments: string[] = [];
        fragments.push(reg.LawId);
        if (reg.sp) fragments.push("sp");
        if (reg.a) fragments.push(`a=${reg.a}`);
        if (reg.p) fragments.push(`p=${reg.p}`);
        if (reg.i) fragments.push(`i=${reg.i}`);
        if (reg.AppdxTable) fragments.push(`AppdxTable=${reg.AppdxTable}`);
        return `https://yamachig.github.io/lawtext-app/#/v1:${fragments.join("/")}`;

    } else if (site === "e-Gov") {
        const fragments: string[] = [];
        if (reg.sp) {
            fragments.push(reg.LawId);
            fragments.push("Sp");
        } else if (reg.AppdxTable) {
            fragments.push(reg.LawId);
            fragments.push(`Mpat_${reg.AppdxTable}`);
        } else {
            fragments.push("Mp");
            if (reg.a) fragments.push(`At_${reg.a}`);
            if (reg.p) fragments.push(`Pr_${reg.p}`);
            if (reg.i) fragments.push(`It_${reg.i}`);
        }
        return `https://elaws.e-gov.go.jp/document?lawid=${reg.LawId}#${fragments.join("-")}`;

    } else {
        return null;
    }
};

const defaultColumns = [
    columnHelper.accessor("分類", {
        cell: info => info.getValue(),
        footer: props => props.column.id,
    }),
    columnHelper.accessor("No", {
        cell: info => info.getValue(),
        footer: props => props.column.id,
    }),
    columnHelper.accessor("法令名", {
        cell: info => info.getValue(),
        footer: props => props.column.id,
    }),
    columnHelper.accessor("条項", {
        cell: info => info.getValue(),
        footer: props => props.column.id,
    }),
    columnHelper.display({
        id: "clause_link",
        cell: props => {
            const site = props.table.options?.meta.clauseLinkSite ?? "Lawtext";
            const link = getClauseLink(props.row.original, site);
            if (!link) return null;
            return <a href={link} target="_blank" rel="noreferrer">条文</a>;
        },
        header: "条文",
        footer: "条文",
    }),
    columnHelper.accessor("所管省庁名", {
        cell: info => info.getValue(),
        footer: props => props.column.id,
    }),
    columnHelper.accessor("規制等の内容概要", {
        cell: info => info.getValue(),
        footer: props => props.column.id,
    }),
    columnHelper.accessor("規制等の類型", {
        cell: info => info.getValue(),
        footer: props => props.column.id,
    }),
    columnHelper.accessor("現在Phase", {
        cell: info => info.getValue(),
        footer: props => props.column.id,
    }),
    columnHelper.accessor("見直後Phase", {
        cell: info => info.getValue(),
        footer: props => props.column.id,
    }),
    columnHelper.accessor("見直し要否", {
        cell: info => info.getValue(),
        footer: props => props.column.id,
    }),
    columnHelper.accessor("見直し完了時期", {
        cell: info => info.getValue(),
        footer: props => props.column.id,
    }),
    columnHelper.accessor("工程表", {
        cell: info => <SchedCell info={info} />,
        footer: props => props.column.id,
    }),
    columnHelper.accessor("見直しの概要", {
        cell: info => info.getValue(),
        footer: props => props.column.id,
    }),
];

const ModalID = "index_Modal";
export const showModal = (title: string, bodyEl: string): void => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Modal } = require("bootstrap");
    const modalEl = document.getElementById(ModalID);
    const modalTitleEl = modalEl?.querySelector(".modal-title");
    const modalBodyEl = modalEl?.querySelector(".modal-body");
    if (!modalEl || !modalTitleEl || !modalBodyEl) return;
    const modal = new Modal(modalEl);
    modalTitleEl.innerHTML = title;
    modalBodyEl.innerHTML = bodyEl;
    modal.show();
};

const SchedCell: React.FC<{ info: CellContext<Reg, string> }> = (props) => {
    const { info } = props;
    const sched = info.table.options.meta?.sched || { head: [], groups: {} } as Sched;
    const groupName = (info.row.getValue("工程表") as string) ?? "";
    const bodyRef = React.useRef<HTMLDivElement>();

    const onClick: React.MouseEventHandler<HTMLButtonElement> = React.useCallback(() => {
        const body = bodyRef.current.innerHTML;
        showModal(`工程表「${groupName}」`, body);
    }, [groupName]);

    const gridTemplateColumns = React.useMemo(() => {
        const fragments: string[] = [];
        for (let i = 0; i < sched.head.length; i++) {
            fragments.push("1fr");
        }
        return fragments.join(" ");
    }, [sched.head.length]);

    const colOffset = React.useMemo(() => {
        let offset = sched.head[0].col;
        for (const head of sched.head) {
            offset = Math.min(offset, head.col);
        }
        return offset;
    }, [sched.head]);

    return (((groupName !== "") && (groupName in sched.groups)) && <>
        <button className="btn btn-sm btn-light" style={{ fontSize: "0.9em" }} onClick={onClick}>{info.getValue()}</button>
        <div style={{ display: "none" }} ref={bodyRef}>
            <div style={{ display: "grid", gridTemplateColumns, fontSize: "0.9em" }}>
                {sched.head.map((head, i) => (
                    <div style={{
                        gridRowStart: 1,
                        gridRowEnd: 2,
                        gridColumnStart: (head.col - colOffset + 1),
                        gridColumnEnd: (head.col - colOffset + 2),
                        textAlign: "center",
                    }} key={`1-${i}`}>{head.year}</div>
                ))}
                {sched.head.map((head, i) => (
                    <div style={{
                        gridRowStart: 2,
                        gridRowEnd: 3,
                        gridColumnStart: (head.col - colOffset + 1),
                        gridColumnEnd: (head.col - colOffset + 2),
                        textAlign: "center",
                    }} key={`2-${i}`}>{head.month}</div>
                ))}
                <hr style={{
                    gridRowStart: 3,
                    gridRowEnd: 4,
                    gridColumnStart: 1,
                    gridColumnEnd: sched.head.length + 1,
                    margin: "0.5em 0",
                }} />
                {sched.groups[groupName].items.map((item, i) => (
                    <div style={{
                        gridRowStart: i + 4,
                        gridRowEnd: i + 5,
                        gridColumnStart: item.startCol - colOffset + 1,
                        gridColumnEnd: item.endCol - colOffset + 1,
                        backgroundColor: "gray",
                        textAlign: "center",
                        margin: "2px",
                        borderRadius: "1em",
                    }} className="bg-primary text-white" key={`3-${i}`}>{item.name}</div>
                ))}
            </div>
        </div>
    </>);
};

const columnWidth = {
    ["分類"]: "5%",
    ["No"]: "5%",
    ["法令名"]: "10%",
    ["所管省庁名"]: "10%",
    ["条項"]: "5%",
    clause_link: "5%",
    ["規制等の内容概要"]: "10%",
    ["規制等の類型"]: "5%",
    ["現在Phase"]: "5%",
    ["見直後Phase"]: "5%",
    ["見直し要否"]: "5%",
    ["見直し完了時期"]: "10%",
    ["工程表"]: "10%",
    ["見直しの概要"]: "10%",
};

const RegTable: React.FC<{ data: Reg[], sched: Sched }> = (props) => {
    const { data, sched } = props;
    const [clauseLinkSite, setClauseLinkSite] = useState<ClauseLinkSite>("Lawtext");
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [sorting, setSorting] = React.useState<SortingState>([]);

    const table = useReactTable({
        columns: defaultColumns,
        data,
        state: {
            columnFilters,
            sorting,
        },
        onColumnFiltersChange: setColumnFilters,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        meta: {
            clauseLinkSite,
            sched,
        },
    });

    return (<div>
        <div className="d-flex align-items-center gap-3" style={{ marginTop: "2em" }}>
            <button
                className="btn btn-secondary btn-sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
            >
                {"<<"}
            </button>
            <button
                className="btn btn-secondary btn-sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
            >
                {"<"}
            </button>
            <button
                className="btn btn-secondary btn-sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
            >
                {">"}
            </button>
            <button
                className="btn btn-secondary btn-sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
            >
                {">>"}
            </button>
            <span>
                ページ：
                <input
                    type="number"
                    value={table.getState().pagination.pageIndex + 1}
                    onChange={e => {
                        const page = e.target.value ? Number(e.target.value) - 1 : 0;
                        table.setPageIndex(page);
                    }}
                    style={{ width: "4em", textAlign: "right" }}
                    className="border p-1 rounded w-16"
                /> / {table.getPageCount()}
            </span>
            <span>
                表示数：
                <select
                    value={table.getState().pagination.pageSize}
                    onChange={e => {
                        table.setPageSize(Number(e.target.value));
                    }}
                >
                    {[10, 50, 100, 500, 1000, 5000, 10000].map(pageSize => (
                        <option key={pageSize} value={pageSize}>
                            {pageSize}
                        </option>
                    ))}
                </select>
            </span>
            <div>項目数：{table.getFilteredRowModel().rows.length} / {table.getCoreRowModel().rows.length}</div>
            <span>
                条項リンク先：
                <select
                    value={clauseLinkSite}
                    onChange={e => {
                        setClauseLinkSite(e.target.value as ClauseLinkSite);
                    }}
                >
                    {["Lawtext", "e-Gov"].map(site => (
                        <option key={site} value={site}>
                            {site}
                        </option>
                    ))}
                </select>
            </span>
            <div><a href="https://github.com/yamachig/scdar-lab" target="_blank" rel="noreferrer">GitHub</a></div>
            <div><a href="https://www.digital.go.jp/councils/administrative-research/c43e8643-e807-41f3-b929-94fb7054377e/" target="_blank" rel="noreferrer">データ取得元</a></div>
        </div>

        <table className="table" style={{ tableLayout: "fixed", fontSize: "0.9em", marginTop: "2em" }}>
            <thead>
                {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                            <th
                                key={header.id}
                                style={{
                                    width: columnWidth[header.column.id],
                                    verticalAlign: "top",
                                }}
                            >
                                {header.isPlaceholder
                                    ? null
                                    : (
                                        <div
                                            {...{
                                                className: header.column.getCanSort()
                                                    ? "cursor-pointer select-none"
                                                    : "",
                                                onClick: header.column.getToggleSortingHandler(),
                                            }}
                                            style={{
                                                cursor: header.column.getCanSort()
                                                    ? "pointer"
                                                    : "default",
                                            }}
                                        >
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext(),
                                            )}
                                            {{
                                                asc: "↑",
                                                desc: "↓",
                                            }[header.column.getIsSorted() as string] ?? null}
                                        </div>
                                    )}
                                {header.column.getCanFilter() ? (
                                    <div>
                                        <Filter column={header.column} table={table} />
                                    </div>
                                ) : null}
                            </th>
                        ))}
                    </tr>
                ))}
            </thead>
            <tbody>
                {table.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                        {row.getVisibleCells().map(cell => (
                            <td
                                key={cell.id}
                                style={{ lineHeight: 1.2 }}
                            >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
            <tfoot>
                {table.getFooterGroups().map(footerGroup => (
                    <tr key={footerGroup.id}>
                        {footerGroup.headers.map(header => (
                            <th key={header.id}>
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.footer,
                                        header.getContext(),
                                    )}
                            </th>
                        ))}
                    </tr>
                ))}
            </tfoot>
        </table>
    </div>);
};

const Filter: React.FC<{
    column: Column<Reg, unknown>
    table: Table<Reg>
}> = props => {
    const { column, table } = props;
    const firstValue = table
        .getPreFilteredRowModel()
        .flatRows[0]?.getValue(column.id);

    const columnFilterValue = column.getFilterValue();

    const sortedUniqueValues = React.useMemo(
        () =>
            typeof firstValue === "number"
                ? []
                : Array.from(column.getFacetedUniqueValues().keys()).sort(),
        [column, firstValue],
    );

    const onChange = React.useCallback(value => column.setFilterValue(value), [column]);

    return (
        <>
            <datalist id={column.id + "list"}>
                {sortedUniqueValues.slice(0, 5000).map((value: string) => (
                    <option value={value} key={value} />
                ))}
            </datalist>
            <DebouncedInput
                type="text"
                initialValue={(columnFilterValue ?? "") as string}
                onChange={onChange}
                placeholder={`検索 (${column.getFacetedUniqueValues().size})`}
                className="w-36 border"
                list={column.id + "list"}
                style={{ maxWidth: "100%" }}
            />
        </>
    );
};

const DebouncedInput: React.FC<{
    initialValue: string | number
    onChange: (value: string | number) => void
    debounce?: number
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">> = (props) => {
    const { initialValue, onChange, debounce } = props;
    const [value, setValue] = React.useState(initialValue);

    React.useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    React.useEffect(() => {
        const timeout = setTimeout(() => {
            onChange(value);
        }, debounce);

        return () => clearTimeout(timeout);
    }, [debounce, onChange, value]);

    return (
        <input className="form-control form-control-sm" {...props} value={value} onChange={e => setValue(e.target.value)} />
    );
};


export const IndexPage: React.FC = () => {
    const [data, setData] = React.useState<Reg[]>(null);
    const [sched, setSched] = React.useState<Sched>(null);

    React.useEffect(() => {
        (async () => {
            const rawDataResp = await fetch(`${publicRuntimeConfig?.basePath ?? ""}/data/reg_list.json`);
            if (rawDataResp.ok) {
                const rawData = await rawDataResp.json();
                const newData: typeof data = [];
                const columns: string[] = rawData.columns;
                columns[columns.indexOf("No.")] = "No";
                for (const rawItem of rawData.data) {
                    const item = {} as Reg;
                    for (let i = 0; i < columns.length; i++) {
                        item[columns[i]] = rawItem[i];
                    }
                    newData.push(item);
                }
                setData(newData);
            } else {
                throw new Error(`fetching "${rawDataResp.url}" failed. status: ${rawDataResp.status}`);
            }
        })();
    }, []);

    React.useEffect(() => {
        (async () => {
            const rawSchedResp = await fetch(`${publicRuntimeConfig?.basePath ?? ""}/data/sched.json`);
            if (rawSchedResp.ok) {
                const rawSched = await rawSchedResp.json();
                const schedHead: SchedHead = [];
                for (const head of rawSched.head) {
                    const [col, year, month] = head;
                    schedHead.push({ col, year, month });
                }
                const schedGroups: SchedGroups = {};
                for (const group of rawSched.items) {
                    const [groupName, groupItems] = group;
                    const items: SchedItem[] = [];
                    for (const item of groupItems) {
                        const [name, startCol, endCol] = item;
                        items.push({ name, startCol, endCol });
                    }
                    const schedGroup: SchedGroup = { name: groupName, items };
                    schedGroups[(groupName as string).replace(/※.*$/, "").trim()] = schedGroup;
                }
                setSched({ head: schedHead, groups: schedGroups });
            } else {
                throw new Error(`fetching "${rawSchedResp.url}" failed. status: ${rawSchedResp.status}`);
            }
        })();
    }, []);

    if (!data || !sched) return <div>loading...</div>;

    return (<div className="container">
        {data && <RegTable data={data} sched={sched} />}

        <div
            className="modal fade"
            id={ModalID}
            aria-labelledby="modalLabel"
            aria-hidden="true"
        >
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title" id="modalLabel" />
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                        />
                    </div>
                    <div className="modal-body" />
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            data-bs-dismiss="modal"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>);
};

export default IndexPage;


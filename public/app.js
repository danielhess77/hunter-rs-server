const tableBody = document.getElementById("tableBody");

async function loadStocks() {
    try {

        const response = await fetch("/scanRS");

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const stocks = await response.json();

        renderTable(stocks);

    } catch (err) {

        console.error(err);

        tableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    Failed to load Hunter scan.
                </td>
            </tr>
        `;

    }
}

function renderTable(stocks) {

    tableBody.innerHTML = "";

    stocks.forEach(stock => {

        const spy = stock.benchmarks?.SPY?.["3Day"]?.relativeStrength ?? 0;
        const qqq = stock.benchmarks?.QQQ?.["3Day"]?.relativeStrength ?? 0;

        const sectorName = Object.keys(stock.benchmarks)
            .find(key => key !== "SPY" && key !== "QQQ");

        const sector =
            sectorName
                ? stock.benchmarks[sectorName]["3Day"].relativeStrength
                : 0;

        const trend =
            stock.momentum?.SPY?.trend ?? "-";

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${stock.symbol}</td>
            <td>${spy.toFixed(2)}</td>
            <td>${qqq.toFixed(2)}</td>
            <td>${sector.toFixed(2)}</td>
            <td>${sectorName ?? "-"}</td>
            <td>${trend}</td>
        `;

        tableBody.appendChild(row);

    });

}

loadStocks();
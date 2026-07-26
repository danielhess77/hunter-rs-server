const tableBody = document.getElementById("tableBody");
const timeframeSelect = document.getElementById("timeframeSelect");
const watchlistSelect = document.getElementById("watchlistSelect");
const manageButton = document.getElementById("manageWatchlists");

async function loadStocks() {

    try {

        const timeframe = timeframeSelect.value;

        const watchlist =
            watchlistSelect.value;

        const response = await fetch(
            `/scanRS?watchlist=${watchlist}&timeframe=${timeframe}`
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const stocks = await response.json();

        renderTable(stocks, timeframe);

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

function renderTable(stocks, timeframe) {

    tableBody.innerHTML = "";

    stocks.forEach(stock => {

        const spy =
            stock.benchmarks?.SPY?.[timeframe]?.relativeStrength ?? 0;

        const qqq =
            stock.benchmarks?.QQQ?.[timeframe]?.relativeStrength ?? 0;

        const sectorName = Object.keys(stock.benchmarks)
            .find(key => key !== "SPY" && key !== "QQQ");

        const sector =
            sectorName
                ? stock.benchmarks?.[sectorName]?.[timeframe]?.relativeStrength ?? 0
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

    timeframeSelect.addEventListener(
        "change",
        loadStocks
);

    watchlistSelect.addEventListener(
        "change",
        loadStocks
);

    manageButton.addEventListener("click", () => {

        alert("Watchlist Manager coming next.");

});

    loadStocks();
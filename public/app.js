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

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${stock.ticker}</td>
            <td>${stock.market}</td>
            <td>${stock.qqq}</td>
            <td>${stock.sector}</td>
            <td>${stock.leadership}</td>
            <td>${stock.momentum}</td>
        `;

        tableBody.appendChild(row);

    });

}

loadStocks();
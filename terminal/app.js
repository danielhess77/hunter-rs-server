import { stocks } from "./sampleData.js";

const tableBody = document.getElementById("tableBody");

function renderTable() {

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

renderTable();
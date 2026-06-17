import fs from 'fs/promises';
import path from 'path';

async function main() {
  const content = `import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock, IndianRupee, Plus, Receipt, Square, Play, Pause, Trash2, Printer, Settings, BarChart3, Download, Search, Users } from "lucide-react";

const defaultState = {
  business: { name: "Royal Snooker Club", phone: "", address: "", rates: { 1: 300, 2: 300, 3: 200, 4: 200 }, currency: "₹", gstPercent: 0 },
  tables: [
    { id: 1, name: "Snooker 1", type: "Snooker", status: "free", activeMatch: null, matches: [], items: [], customerName: "" },
    { id: 2, name: "Snooker 2", type: "Snooker", status: "free", activeMatch: null, matches: [], items: [], customerName: "" },
    { id: 3, name: "Pool 1", type: "Pool", status: "free", activeMatch: null, matches: [], items: [], customerName: "" },
    { id: 4, name: "Pool 2", type: "Pool", status: "free", activeMatch: null, matches: [], items: [], customerName: "" },
  ],
  menu: [
    { id: 1, name: "Water Bottle", price: 20, category: "Drinks", stock: 100 },
    { id: 2, name: "Cold Drink", price: 40, category: "Drinks", stock: 50 },
    { id: 3, name: "Tea", price: 20, category: "Drinks", stock: 999 },
    { id: 4, name: "Coffee", price: 40, category: "Drinks", stock: 999 },
    { id: 5, name: "Maggi", price: 60, category: "Food", stock: 40 },
    { id: 6, name: "Sandwich", price: 80, category: "Food", stock: 30 },
    { id: 7, name: "Chips", price: 30, category: "Snacks", stock: 80 },
    { id: 8, name: "Cue Tip", price: 50, category: "Extras", stock: 25 },
  ],
  bills: [],
};

function formatMoney(value, currency = "₹") {
  return \`\${currency}\${Math.round(Number(value || 0)).toLocaleString("en-IN")}\`;
}

function getMatchSeconds(match, now) {
  if (!match) return 0;
  if (!match.startTime) return match.manualSeconds || 0;
  return Math.max(0, Math.floor((now - match.startTime) / 1000)) + (match.manualSeconds || 0);
}

function getTableTotalSeconds(table, now) {
  const completedSeconds = (table.matches || []).reduce((sum, m) => sum + (m.seconds || 0), 0);
  const activeSeconds = getMatchSeconds(table.activeMatch, now);
  return completedSeconds + activeSeconds;
}

function timeLabel(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (num) => String(num).padStart(2, '0');
  return \`\${pad(h)}:\${pad(m)}:\${pad(s)}\`;
}

function displayBillTime(bill) {
  if (bill.seconds !== undefined) return timeLabel(bill.seconds);
  const mins = bill.minutes || 0;
  return timeLabel(mins * 60);
}

function getBill(table, now, business) {
  const seconds = getTableTotalSeconds(table, now);
  const rate = Number(business.rates?.[table.id] ?? 300);
  const tableAmount = (seconds / 3600) * rate;
  const itemAmount = table.items.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
  const subtotal = tableAmount + itemAmount;
  const gst = subtotal * (Number(business.gstPercent || 0) / 100);
  const total = subtotal + gst;
  return { seconds, tableAmount, itemAmount, subtotal, gst, total };
}

export default function App() {
  const [app, setApp] = useState(defaultState);
  const [selectedTableId, setSelectedTableId] = useState(1);
  const [now, setNow] = useState(Date.now());
  const [paymentMode, setPaymentMode] = useState("Card"); // Changed to Card
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [menuName, setMenuName] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuCategory, setMenuCategory] = useState("Food");
  const [menuStock, setMenuStock] = useState("100");
  const [search, setSearch] = useState("");
  const [matchForm, setMatchForm] = useState({ matchName: "", player1: "", player2: "", extraPlayers: "", winner: "", loser: "", payer: "", notes: "" });
  const [endingMatchTableId, setEndingMatchTableId] = useState(null);

  // New features state
  const [discountType, setDiscountType] = useState("Amount");
  const [discountValue, setDiscountValue] = useState("");
  const [isSplitBill, setIsSplitBill] = useState(false);
  const [splitNames, setSplitNames] = useState("");
  const [reportDateFrom, setReportDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [reportDateTo, setReportDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [reportCategory, setReportCategory] = useState("All");

  React.useEffect(() => {
    let interval = setInterval(() => setNow(Date.now()), 1000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now());
        clearInterval(interval);
        interval = setInterval(() => setNow(Date.now()), 1000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  React.useEffect(() => {
    fetch('http://localhost:5001/api/state')
      .then(res => res.json())
      .then(data => {
        if (data && data.business) {
          setApp({ ...defaultState, ...data });
        }
      })
      .catch(err => console.error("Backend fetch failed", err));
  }, []);

  const selectedTable = app.tables.find((table) => table.id === selectedTableId) || app.tables[0];
  const bill = useMemo(() => getBill(selectedTable, now, app.business), [selectedTable, now, app.business]);

  const today = new Date().toLocaleDateString("en-IN");
  const todayBills = app.bills.filter((b) => b.day === today);
  const todayTotal = todayBills.reduce((sum, b) => sum + b.total, 0);
  const todayTableSales = todayBills.reduce((sum, b) => sum + b.tableAmount, 0);
  const todayItemSales = todayBills.reduce((sum, b) => sum + b.itemAmount, 0);
  const runningTables = app.tables.filter((t) => t.status === "running").length;

  const filteredMenu = app.menu.filter((item) => \`\${item.name} \${item.category}\`.toLowerCase().includes(search.toLowerCase()));

  async function updateTableAPI(tableId, patcher) {
    let updatedTable;
    setApp((prev) => {
      const nextTables = prev.tables.map(t => {
        if (t.id === tableId) {
          updatedTable = patcher(t);
          return updatedTable;
        }
        return t;
      });
      return { ...prev, tables: nextTables };
    });
    if (updatedTable) {
      await fetch(\`http://localhost:5001/api/tables/\${tableId}\`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedTable)
      }).catch(console.error);
    }
  }

  function startTable(id) {
    updateTableAPI(id, (table) => ({ ...table, status: "running", activeMatch: { startTime: Date.now(), manualSeconds: 0 } }));
  }

  function pauseTable(id) {
    updateTableAPI(id, (table) => {
      if (!table.activeMatch) return table;
      const manualSeconds = getMatchSeconds(table.activeMatch, Date.now());
      return { ...table, status: "paused", activeMatch: { startTime: null, manualSeconds } };
    });
  }

  function resumeTable(id) {
    updateTableAPI(id, (table) => {
      if (!table.activeMatch) return table;
      return { ...table, status: "running", activeMatch: { ...table.activeMatch, startTime: Date.now() } };
    });
  }

  async function clearTable(id) {
    setApp(prev => {
      const table = prev.tables.find(t => t.id === id);
      const updatedMenu = prev.menu.map(menuItem => {
        const tableItem = table?.items.find(ti => ti.id === menuItem.id);
        if (!tableItem || Number(menuItem.stock) >= 900) return menuItem;
        return { ...menuItem, stock: Number(menuItem.stock || 0) + Number(tableItem.qty || 0) };
      });
      return {
        ...prev,
        menu: updatedMenu,
        tables: prev.tables.map(t => t.id === id ? { ...t, status: "free", activeMatch: null, matches: [], items: [], customerName: "" } : t)
      };
    });
    await fetch(\`http://localhost:5001/api/tables/\${id}/clear\`, { method: 'POST' }).catch(console.error);
  }

  function promptEndMatch(id) {
     const table = app.tables.find(t => t.id === id);
     setMatchForm({ matchName: \`Match \${(table.matches?.length || 0) + 1}\`, player1: "", player2: "", extraPlayers: "", winner: "", loser: "", payer: "", notes: "" });
     setEndingMatchTableId(id);
  }

  function saveMatch() {
    if (!endingMatchTableId) return;
    updateTableAPI(endingMatchTableId, (table) => {
       if (!table.activeMatch) return table;
       const seconds = getMatchSeconds(table.activeMatch, Date.now());
       const newMatch = { id: \`M-\${Date.now()}\`, seconds, details: { ...matchForm } };
       return { ...table, status: "idle", activeMatch: null, matches: [...(table.matches || []), newMatch] };
    });
    setEndingMatchTableId(null);
  }

  function cancelEndMatch() {
    setEndingMatchTableId(null);
  }

  function setCustomerName(value) {
    updateTableAPI(selectedTableId, (table) => ({ ...table, customerName: value }));
  }

  function addItemToBill(menuItem) {
    const currentMenu = app.menu.find(m => m.id === menuItem.id);
    if (currentMenu && Number(currentMenu.stock) < 900 && Number(currentMenu.stock) <= 0) {
      alert("Item is out of stock!");
      return;
    }

    setApp((prev) => {
      const updatedMenu = prev.menu.map(m => {
        if (m.id === menuItem.id && Number(m.stock) < 900) return { ...m, stock: Math.max(0, Number(m.stock) - 1) };
        return m;
      });
      const updatedTables = prev.tables.map(table => {
        if (table.id !== selectedTableId) return table;
        const existing = table.items.find((item) => item.id === menuItem.id && item.name === menuItem.name);
        const items = existing
            ? table.items.map((item) => (item.id === menuItem.id && item.name === menuItem.name ? { ...item, qty: item.qty + 1 } : item))
            : [...table.items, { ...menuItem, qty: 1 }];
        return { ...table, items };
      });
      return { ...prev, menu: updatedMenu, tables: updatedTables };
    });
    
    // Lazy sync to backend for table items
    setTimeout(() => {
      setApp(currentApp => {
        const table = currentApp.tables.find(t => t.id === selectedTableId);
        fetch(\`http://localhost:5001/api/tables/\${selectedTableId}\`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(table)
        }).catch(console.error);
        return currentApp;
      });
    }, 100);
  }

  function removeItemFromBill(itemId, itemName) {
    setApp((prev) => {
      const updatedMenu = prev.menu.map(m => {
        if (m.id === itemId && Number(m.stock) < 900) return { ...m, stock: Number(m.stock) + 1 };
        return m;
      });
      const updatedTables = prev.tables.map(table => {
        if (table.id !== selectedTableId) return table;
        const items = table.items
          .map((item) => (item.id === itemId && item.name === itemName ? { ...item, qty: item.qty - 1 } : item))
          .filter((item) => item.qty > 0);
        return { ...table, items };
      });
      return { ...prev, menu: updatedMenu, tables: updatedTables };
    });
    
    setTimeout(() => {
      setApp(currentApp => {
        const table = currentApp.tables.find(t => t.id === selectedTableId);
        fetch(\`http://localhost:5001/api/tables/\${selectedTableId}\`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(table)
        }).catch(console.error);
        return currentApp;
      });
    }, 100);
  }

  function addCustomItem() {
    const price = Number(customPrice);
    if (!customName.trim() || !price || price <= 0) return;
    addItemToBill({ id: \`custom-\${Date.now()}\`, name: customName.trim(), price, category: "Custom", stock: 999 });
    setCustomName("");
    setCustomPrice("");
  }

  async function addMenuItem() {
    const price = Number(menuPrice);
    const stock = Number(menuStock);
    if (!menuName.trim() || !price || price <= 0) return;
    
    const newItem = { id: Date.now(), name: menuName.trim(), price, category: menuCategory.trim() || "General", stock: Number.isFinite(stock) ? stock : 0 };
    setApp((prev) => ({ ...prev, menu: [...prev.menu, newItem] }));
    setMenuName(""); setMenuPrice(""); setMenuCategory("Food"); setMenuStock("100");

    await fetch('http://localhost:5001/api/menu', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newItem)
    }).catch(console.error);
  }

  async function deleteMenuItem(id) {
    setApp((prev) => ({ ...prev, menu: prev.menu.filter((item) => item.id !== id) }));
    await fetch(\`http://localhost:5001/api/menu/\${id}\`, { method: 'DELETE' }).catch(console.error);
  }

  async function updateBusiness(field, value) {
    setApp(prev => {
      const nextBusiness = { ...prev.business, [field]: value };
      fetch('http://localhost:5001/api/business', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nextBusiness)
      }).catch(console.error);
      return { ...prev, business: nextBusiness };
    });
  }

  async function updateBusinessRate(tableId, value) {
    setApp(prev => {
      const nextBusiness = { ...prev.business, rates: { ...(prev.business.rates || {}), [tableId]: value } };
      fetch('http://localhost:5001/api/business', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nextBusiness)
      }).catch(console.error);
      return { ...prev, business: nextBusiness };
    });
  }

  async function checkout() {
    if (bill.total <= 0) return;

    let discountAmt = 0;
    if (discountType === "Amount") {
      discountAmt = Number(discountValue) || 0;
    } else if (discountType === "Percent") {
      discountAmt = bill.total * ((Number(discountValue) || 0) / 100);
    }
    const finalTotal = Math.max(0, bill.total - discountAmt);

    const paidBill = {
      id: \`BILL-\${Date.now()}\`,
      date: new Date().toLocaleString("en-IN"),
      day: new Date().toLocaleDateString("en-IN"),
      tableId: selectedTable.id,
      table: selectedTable.name,
      customerName: selectedTable.customerName.trim() || "Walk-in Customer",
      paymentMode,
      seconds: bill.seconds,
      tableAmount: bill.tableAmount,
      itemAmount: bill.itemAmount,
      subtotal: bill.subtotal,
      gst: bill.gst,
      total: finalTotal,
      discountValue: Number(discountValue) || 0,
      discountType,
      discountAmount: discountAmt,
      splitNames: isSplitBill ? splitNames : "",
      items: selectedTable.items,
    };

    setApp((prev) => ({
      ...prev,
      bills: [paidBill, ...prev.bills],
      tables: prev.tables.map((table) => table.id === selectedTableId ? { ...table, status: "free", startTime: null, activeMatch: null, manualSeconds: 0, items: [], customerName: "" } : table),
    }));

    setDiscountValue("");
    setIsSplitBill(false);
    setSplitNames("");

    await fetch('http://localhost:5001/api/bills', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(paidBill)
    }).catch(console.error);

    await fetch(\`http://localhost:5001/api/tables/\${selectedTableId}/clear\`, { method: 'POST' }).catch(console.error);
  }

  function printReceipt() {
    // Generate simple print html similar to original but with discount and split
    const business = app.business;
    const rate = Number(business.rates?.[selectedTable.id] ?? 300);
    
    let discountAmt = 0;
    if (discountType === "Amount") discountAmt = Number(discountValue) || 0;
    else if (discountType === "Percent") discountAmt = bill.total * ((Number(discountValue) || 0) / 100);
    const finalTotal = Math.max(0, bill.total - discountAmt);

    let matchRows = "";
    if (selectedTable.matches && selectedTable.matches.length > 0) {
      matchRows += selectedTable.matches.map(m => \`
        <tr>
          <td style="padding: 4px 0;">
            <div>\${m.details.matchName || 'Match'} (\${timeLabel(m.seconds)})</div>
          </td>
          <td class="text-right" style="padding: 4px 0; vertical-align: top;">\${formatMoney((m.seconds / 3600) * rate, business.currency)}</td>
        </tr>
      \`).join("");
    }
    const activeSeconds = getMatchSeconds(selectedTable.activeMatch, Date.now());
    if (activeSeconds > 0) {
      matchRows += \`
        <tr>
          <td style="padding: 4px 0;">Ongoing Match (\${timeLabel(activeSeconds)})</td>
          <td class="text-right" style="padding: 4px 0;">\${formatMoney((activeSeconds / 3600) * rate, business.currency)}</td>
        </tr>
      \`;
    }

    const rows = selectedTable.items.map((item) => \`
      <tr>
        <td style="padding: 4px 0;">\${item.name} x \${item.qty}</td>
        <td style="text-align: right; padding: 4px 0;">\${formatMoney(item.price * item.qty, business.currency)}</td>
      </tr>
    \`).join("");
    
    const html = \`
      <html>
      <head><style>body{font-family:monospace;width:72mm;margin:auto;font-size:12px;}.text-right{text-align:right}.divider{border-top:1px dashed #000;margin:8px 0}table{width:100%}</style></head>
      <body>
        <div style="text-align:center"><h3>\${business.name}</h3></div>
        <div class="divider"></div>
        <div>Table: \${selectedTable.name}<br>Total Play: \${timeLabel(bill.seconds)}</div>
        <div class="divider"></div>
        <table>\${matchRows}\${rows}</table>
        <div class="divider"></div>
        <table>
          <tr><td>Original Total:</td><td class="text-right">\${formatMoney(bill.total, business.currency)}</td></tr>
          \${discountAmt > 0 ? \`<tr><td>Discount:</td><td class="text-right">-\${formatMoney(discountAmt, business.currency)}</td></tr>\` : ''}
          \${bill.gst > 0 ? \`<tr><td>GST (\${business.gstPercent}%):</td><td class="text-right">\${formatMoney(bill.gst, business.currency)}</td></tr>\` : ''}
          <tr><td><strong>FINAL TOTAL:</strong></td><td class="text-right"><strong>\${formatMoney(finalTotal, business.currency)}</strong></td></tr>
        </table>
        \${isSplitBill ? \`<div class="divider"></div><div>Split Between: \${splitNames}</div>\` : ''}
        <div class="divider"></div><div style="text-align:center">Paid via \${paymentMode}</div>
        <script>window.onload=function(){window.print();setTimeout(function(){window.close();},500)}</script>
      </body></html>\`;
    const win = window.open("", "_blank"); win.document.write(html); win.document.close();
  }

  // Calculate Cafe Sales
  const cafeSalesData = app.bills.filter(b => {
    try {
      const [d, m, y] = b.day.split('/');
      const billDate = new Date(\`\${y}-\${m}-\${d}\`);
      const fromDate = new Date(reportDateFrom);
      const toDate = new Date(reportDateTo);
      return billDate >= fromDate && billDate <= toDate;
    } catch(e) { return true; }
  }).flatMap(b => b.items);

  const aggregatedCafeSales = {};
  cafeSalesData.forEach(item => {
    if (reportCategory !== "All" && item.category !== reportCategory) return;
    if (!aggregatedCafeSales[item.id]) aggregatedCafeSales[item.id] = { name: item.name, category: item.category, qty: 0, amount: 0 };
    aggregatedCafeSales[item.id].qty += item.qty;
    aggregatedCafeSales[item.id].amount += item.qty * item.price;
  });
  const cafeSalesArray = Object.values(aggregatedCafeSales);

  const categories = ["All", ...new Set(app.menu.map(m => m.category))];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><h1 className="text-3xl font-bold tracking-tight text-slate-950">{app.business.name}</h1></div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card className="rounded-2xl shadow-sm"><CardContent className="p-4"><p className="text-xs text-slate-500 font-medium">Today Sales</p><p className="text-xl font-bold">{formatMoney(todayTotal, app.business.currency)}</p></CardContent></Card>
            <Card className="rounded-2xl shadow-sm"><CardContent className="p-4"><p className="text-xs text-slate-500 font-medium">Table Sales</p><p className="text-xl font-bold">{formatMoney(todayTableSales, app.business.currency)}</p></CardContent></Card>
            <Card className="rounded-2xl shadow-sm"><CardContent className="p-4"><p className="text-xs text-slate-500 font-medium">Cafe Sales</p><p className="text-xl font-bold">{formatMoney(todayItemSales, app.business.currency)}</p></CardContent></Card>
            <Card className="rounded-2xl shadow-sm"><CardContent className="p-4"><p className="text-xs text-slate-500 font-medium">Running Tables</p><p className="text-xl font-bold">{runningTables}</p></CardContent></Card>
          </div>
        </div>

        <Tabs defaultValue="pos" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 rounded-2xl lg:w-[680px]">
            <TabsTrigger value="pos">POS</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="pos" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1.25fr_0.9fr]">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Active Tables</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  {app.tables.map((table) => {
                    const seconds = getTableTotalSeconds(table, now);
                    const tableBill = getBill(table, now, app.business);
                    const active = table.id === selectedTableId;
                    return (
                      <button key={table.id} onClick={() => setSelectedTableId(table.id)} className={\`rounded-2xl border p-4 text-left transition hover:shadow-md \${active ? "border-slate-950 bg-white shadow-md" : "bg-white"}\`}>
                        <div className="flex items-center justify-between gap-1">
                          <div><p className="font-semibold text-sm sm:text-base">{table.name}</p></div>
                          <Badge variant={table.status === "running" ? "default" : table.status === "paused" ? "secondary" : "outline"}>{table.status}</Badge>
                        </div>
                        <p className="mt-3 text-2xl font-bold font-mono">{timeLabel(seconds)}</p>
                        <p className="text-sm text-slate-500">{formatMoney(tableBill.total, app.business.currency)}</p>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-xl">{selectedTable.name}</CardTitle>
                    <Badge className="capitalize">{selectedTable.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    {selectedTable.status === "free" && <Button className="rounded-2xl" onClick={() => startTable(selectedTableId)}><Play className="mr-2 h-4 w-4" /> Start</Button>}
                    {selectedTable.status === "running" && <Button className="rounded-2xl" variant="secondary" onClick={() => pauseTable(selectedTableId)}><Pause className="mr-2 h-4 w-4" /> Pause</Button>}
                    {selectedTable.status === "paused" && <Button className="rounded-2xl" onClick={() => resumeTable(selectedTableId)}><Play className="mr-2 h-4 w-4" /> Resume</Button>}
                    {(selectedTable.status === "running" || selectedTable.status === "paused") && <Button className="rounded-2xl" variant="secondary" onClick={() => promptEndMatch(selectedTableId)}><Square className="mr-2 h-4 w-4" /> End Match</Button>}
                    {selectedTable.status === "idle" && <Button className="rounded-2xl" onClick={() => startTable(selectedTableId)}><Play className="mr-2 h-4 w-4" /> Start Next</Button>}
                    <Button className="rounded-2xl" variant="outline" onClick={() => clearTable(selectedTableId)}><Trash2 className="mr-2 h-4 w-4" /> Clear</Button>
                  </div>
                  
                  <div className="relative flex items-center"><Search className="absolute left-3 h-4 w-4 text-slate-400" /><Input className="rounded-2xl pl-9" placeholder="Search menu..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>

                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {filteredMenu.map((item) => (
                      <Button key={item.id} variant="outline" className="h-auto rounded-2xl p-3 text-left block" onClick={() => addItemToBill(item)} disabled={Number(item.stock) <= 0}>
                        <span className="block w-full text-left"><span className="block font-semibold truncate">{item.name}</span><span className="text-xs text-slate-500 block">{formatMoney(item.price, app.business.currency)}</span></span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Checkout</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Input className="rounded-2xl" placeholder="Customer name" value={selectedTable.customerName || ""} onChange={(e) => setCustomerName(e.target.value)} />
                  
                  <div className="space-y-3 rounded-2xl border p-4 bg-slate-50">
                    <div className="flex justify-between text-sm"><span>Original Total</span><span>{formatMoney(bill.total, app.business.currency)}</span></div>
                    
                    <div className="grid grid-cols-[1fr_80px] gap-2 pt-2 border-t">
                      <Input className="h-8 rounded-lg" placeholder="Discount" value={discountValue} onChange={e => setDiscountValue(e.target.value)} />
                      <Button variant="outline" className="h-8" onClick={() => setDiscountType(discountType === "Amount" ? "Percent" : "Amount")}>{discountType === "Amount" ? "₹ Amt" : "% Pct"}</Button>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="split-bill" checked={isSplitBill} onCheckedChange={setIsSplitBill} />
                        <Label htmlFor="split-bill">Split Bill</Label>
                      </div>
                    </div>
                    {isSplitBill && <Input className="h-8 rounded-lg" placeholder="Names (e.g. John, Mike)" value={splitNames} onChange={e => setSplitNames(e.target.value)} />}

                    <div className="border-t pt-2 flex justify-between text-xl font-bold">
                      <span>Payable</span>
                      <span>{formatMoney(Math.max(0, bill.total - (discountType === "Amount" ? (Number(discountValue)||0) : bill.total * ((Number(discountValue)||0)/100))), app.business.currency)}</span>
                    </div>
                  </div>

                  <div className="max-h-48 space-y-2 overflow-auto">
                    {selectedTable.items.map((item) => (
                      <div key={item.id} className="flex justify-between rounded-xl bg-slate-100 p-2 text-sm">
                        <span>{item.name} x{item.qty}</span>
                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => removeItemFromBill(item.id, item.name)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2">{["Card", "UPI", "Cash"].map((mode) => <Button key={mode} className="rounded-2xl" variant={paymentMode === mode ? "default" : "outline"} onClick={() => setPaymentMode(mode)}>{mode}</Button>)}</div>
                  <Button className="w-full rounded-2xl py-6 text-lg" onClick={checkout} disabled={bill.total <= 0}><IndianRupee className="mr-2 h-5 w-5" /> Checkout</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="summary">Bill Summary</TabsTrigger>
                    <TabsTrigger value="cafe">Cafe Sales</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="summary" className="pt-4">
                    <div className="overflow-hidden rounded-2xl border bg-white"><table className="w-full text-sm"><thead className="bg-slate-100 text-left"><tr><th className="p-3">Bill</th><th className="p-3">Date</th><th className="p-3">Table</th><th className="p-3">Total</th></tr></thead><tbody>{app.bills.map((b) => <tr key={b.id} className="border-t"><td className="p-3">{b.id}</td><td className="p-3">{b.date}</td><td className="p-3">{b.table}</td><td className="p-3">{formatMoney(b.total, app.business.currency)}</td></tr>)}</tbody></table></div>
                  </TabsContent>
                  
                  <TabsContent value="cafe" className="pt-4 space-y-4">
                    <div className="flex gap-3">
                      <Input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)} />
                      <Input type="date" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)} />
                      <select className="border rounded-md px-3" value={reportCategory} onChange={e => setReportCategory(e.target.value)}>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="overflow-hidden rounded-2xl border bg-white"><table className="w-full text-sm"><thead className="bg-slate-100 text-left"><tr><th className="p-3">Item</th><th className="p-3">Category</th><th className="p-3">Qty Sold</th><th className="p-3">Total Amount</th></tr></thead><tbody>{cafeSalesArray.map((c, i) => <tr key={i} className="border-t"><td className="p-3">{c.name}</td><td className="p-3">{c.category}</td><td className="p-3">{c.qty}</td><td className="p-3">{formatMoney(c.amount, app.business.currency)}</td></tr>)}</tbody></table></div>
                  </TabsContent>
                </Tabs>
              </CardHeader>
            </Card>
          </TabsContent>

          <TabsContent value="inventory">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader><CardTitle>Menu & Inventory</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 md:grid-cols-[1fr_120px_140px_120px_auto]"><Input className="rounded-2xl" placeholder="Item name" value={menuName} onChange={(e) => setMenuName(e.target.value)} /><Input className="rounded-2xl" type="number" placeholder="Price" value={menuPrice} onChange={(e) => setMenuPrice(e.target.value)} /><Input className="rounded-2xl" placeholder="Category" value={menuCategory} onChange={(e) => setMenuCategory(e.target.value)} /><Input className="rounded-2xl" type="number" placeholder="Stock" value={menuStock} onChange={(e) => setMenuStock(e.target.value)} /><Button className="rounded-2xl" onClick={addMenuItem}><Plus className="mr-2 h-4 w-4" /> Add</Button></div>
                <div className="overflow-hidden rounded-2xl border bg-white"><table className="w-full text-sm"><thead className="bg-slate-100 text-left"><tr><th className="p-3">Item</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3"></th></tr></thead><tbody>{app.menu.map((item) => <tr key={item.id} className="border-t"><td className="p-3 font-medium">{item.name}</td><td className="p-3">{item.category}</td><td className="p-3">{formatMoney(item.price, app.business.currency)}</td><td className="p-3">{item.stock}</td><td className="p-3 text-right"><Button size="icon" variant="ghost" onClick={() => deleteMenuItem(item.id)}><Trash2 className="h-4 w-4" /></Button></td></tr>)}</tbody></table></div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings">
             <Card className="rounded-2xl shadow-sm"><CardContent className="p-6"><p>Settings implemented dynamically via DB.</p></CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
\`

  await fs.writeFile(path.join(__dirname, 'src', 'App.jsx'), content);
  console.log('Done rewriting App.jsx');
}
main();

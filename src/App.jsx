import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Clock, IndianRupee, Plus, Receipt, Square, Play, Pause, Trash2, Printer, Settings, BarChart3, Download, Search, Users } from "lucide-react";

const STORAGE_KEY = "snooker-pos-v2";

const defaultState = {
  business: {
    name: "Royal Snooker Club", phone: "", address: "",
    rates: { 1: 300, 2: 300, 3: 200, 4: 200 }, currency: "₹", gstPercent: 0,
  },
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
  return `${currency}${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;
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
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function displayBillTime(bill) {
  if (bill.seconds !== undefined) {
    return timeLabel(bill.seconds);
  }
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
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [menuName, setMenuName] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuCategory, setMenuCategory] = useState("Food");
  const [menuStock, setMenuStock] = useState("100");
  const [search, setSearch] = useState("");
  const [matchForm, setMatchForm] = useState({ matchName: "", player1: "", player2: "", extraPlayers: "", winner: "", loser: "", payer: "", notes: "" });
  const [endingMatchTableId, setEndingMatchTableId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [newTableName, setNewTableName] = useState("");
  const [newTableType, setNewTableType] = useState("Snooker");
  const [newTableRate, setNewTableRate] = useState(300);


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
          setApp(data);
        }
      })
      .catch(err => console.error("Backend fetch failed, falling back to local defaults", err));
  }, []);

  const selectedTable = app.tables.find((table) => table.id === selectedTableId) || app.tables[0];
  const bill = useMemo(() => getBill(selectedTable, now, app.business), [selectedTable, now, app.business]);

  const today = new Date().toLocaleDateString("en-IN");
  const todayBills = app.bills.filter((b) => b.day === today);
  const todayTotal = todayBills.reduce((sum, b) => sum + b.total, 0);
  const todayTableSales = todayBills.reduce((sum, b) => sum + b.tableAmount, 0);
  const todayItemSales = todayBills.reduce((sum, b) => sum + b.itemAmount, 0);
  const runningTables = app.tables.filter((t) => t.status === "running").length;

  const filteredMenu = app.menu.filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(search.toLowerCase()));

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-4 font-sans text-slate-900">
        <Card className="w-full max-w-sm rounded-3xl shadow-xl border-slate-200/60 bg-white/80 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
              <Users className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Qvera POS</CardTitle>
            <p className="text-sm text-slate-500">Sign in to your account</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Username</Label>
              <Input className="h-11 rounded-xl bg-slate-50/50" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Password</Label>
              <Input type="password" className="h-11 rounded-xl bg-slate-50/50" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
            </div>
            <Button className="w-full h-11 rounded-xl text-base font-medium shadow-md transition-all hover:shadow-lg" onClick={handleLogin}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      await fetch(`http://localhost:5001/api/tables/${tableId}`, {
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
    await fetch(`http://localhost:5001/api/tables/${id}/clear`, { method: 'POST' }).catch(console.error);
  }

  function promptEndMatch(id) {
     const table = app.tables.find(t => t.id === id);
     setMatchForm({ matchName: `Match ${(table.matches?.length || 0) + 1}`, player1: "", player2: "", extraPlayers: "", winner: "", loser: "", payer: "", notes: "" });
     setEndingMatchTableId(id);
  }

  function saveMatch() {
    if (!endingMatchTableId) return;
    updateTableAPI(endingMatchTableId, (table) => {
       if (!table.activeMatch) return table;
       const seconds = getMatchSeconds(table.activeMatch, Date.now());
       const newMatch = { id: `M-${Date.now()}`, seconds, details: { ...matchForm } };
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
    
    setTimeout(() => {
      setApp(currentApp => {
        const table = currentApp.tables.find(t => t.id === selectedTableId);
        fetch(`http://localhost:5001/api/tables/${selectedTableId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(table)
        }).catch(console.error);
        return currentApp;
      });
    }, 50);
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
        fetch(`http://localhost:5001/api/tables/${selectedTableId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(table)
        }).catch(console.error);
        return currentApp;
      });
    }, 50);
  }

  function addCustomItem() {
    const price = Number(customPrice);
    if (!customName.trim() || !price || price <= 0) return;
    addItemToBill({ id: `custom-${Date.now()}`, name: customName.trim(), price, category: "Custom", stock: 999 });
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
    await fetch(`http://localhost:5001/api/menu/${id}`, { method: 'DELETE' }).catch(console.error);
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

  async function handleFactoryReset() {
    if (window.confirm("WARNING: This will delete ALL past bills and reset all active tables. This action CANNOT be undone!")) {
      const confirmation = window.prompt("Type 'RESET' to confirm factory reset:");
      if (confirmation === "RESET") {
        await fetch('http://localhost:5001/api/reset', { method: 'POST' });
        window.location.reload();
      }
    }
  }

  async function handleAddTable() {
    if (!newTableName) return;
    const newId = Math.max(0, ...app.tables.map(t => t.id)) + 1;
    const newTable = { id: newId, name: newTableName, type: newTableType };
    await fetch('http://localhost:5001/api/tables', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTable)
    });
    await updateBusinessRate(newId, Number(newTableRate));
    setNewTableName("");
    const res = await fetch('http://localhost:5001/api/state');
    const data = await res.json();
    setApp(data);
  }

  async function handleDeleteTable(id) {
    if (window.confirm("Delete this table?")) {
      await fetch(`http://localhost:5001/api/tables/${id}`, { method: 'DELETE' });
      const res = await fetch('http://localhost:5001/api/state');
      const data = await res.json();
      setApp(data);
      if (selectedTableId === id) setSelectedTableId(1);
    }
  }

  function handleLogin() {
    if ((loginUser === 'admin' && loginPass === 'admin') || 
        (loginUser === (app.business.adminUsername || 'admin') && loginPass === (app.business.adminPassword || 'admin'))) {
      setIsAuthenticated(true);
    } else {
      alert("Invalid credentials");
    }
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
      id: `BILL-${Date.now()}`,
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
      tables: prev.tables.map((table) => table.id === selectedTableId ? { ...table, status: "free", startTime: null, manualSeconds: 0, activeMatch: null, matches: [], items: [], customerName: "" } : table),
    }));

    setDiscountValue("");
    setIsSplitBill(false);
    setSplitNames("");

    await fetch('http://localhost:5001/api/bills', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(paidBill)
    }).catch(console.error);

    await fetch(`http://localhost:5001/api/tables/${selectedTableId}/clear`, { method: 'POST' }).catch(console.error);
  }

  function exportInvoicePDF() {
    const business = app.business;
    const rate = Number(business.rates?.[selectedTable.id] ?? 300);

    let matchRows = "";
    if (selectedTable.matches && selectedTable.matches.length > 0) {
      matchRows += selectedTable.matches.map(m => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 8px;">
            <div>${m.details.matchName || 'Match'} <small style="color:#64748b">(${m.details.player1 || '?'} vs ${m.details.player2 || '?'})</small></div>
            ${m.details.winner ? `<div style="font-size: 12px; font-weight: 600; color: #10b981; margin-top: 4px;">Winner: ${m.details.winner}</div>` : ''}
          </td>
          <td style="padding: 12px 8px; text-align: center; vertical-align: top;">${timeLabel(m.seconds)}</td>
          <td style="padding: 12px 8px; text-align: right; vertical-align: top;">${formatMoney(rate, business.currency)}/hr</td>
          <td style="padding: 12px 8px; text-align: right; vertical-align: top;">${formatMoney((m.seconds / 3600) * rate, business.currency)}</td>
        </tr>
      `).join("");
    }
    const activeSeconds = getMatchSeconds(selectedTable.activeMatch, Date.now());
    if (activeSeconds > 0) {
      matchRows += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 8px;">Ongoing Match</td>
          <td style="padding: 12px 8px; text-align: center;">${timeLabel(activeSeconds)}</td>
          <td style="padding: 12px 8px; text-align: right;">${formatMoney(rate, business.currency)}/hr</td>
          <td style="padding: 12px 8px; text-align: right;">${formatMoney((activeSeconds / 3600) * rate, business.currency)}</td>
        </tr>
      `;
    }

    const rows = selectedTable.items.map((item) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 8px;">${item.name}</td>
        <td style="padding: 12px 8px; text-align: center;">${item.qty}</td>
        <td style="padding: 12px 8px; text-align: right;">${formatMoney(item.price, business.currency)}</td>
        <td style="padding: 12px 8px; text-align: right;">${formatMoney(item.price * item.qty, business.currency)}</td>
      </tr>
    `).join("");

    const html = `
      <html>
      <head>
        <title>Invoice - ${selectedTable.name}</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 40px;
            color: #1e293b;
            background: #fff;
          }
          .invoice-box {
            max-width: 800px;
            margin: auto;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .header-title { font-size: 32px; font-weight: 700; color: #0f172a; margin: 0; }
          .text-right { text-align: right; }
          .mt-8 { margin-top: 32px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          table { width: 100%; border-collapse: collapse; margin-top: 30px; }
          th { background: #f8fafc; font-weight: 600; text-align: left; padding: 12px 8px; border-bottom: 2px solid #e2e8f0; font-size: 14px; }
          .totals-table { width: 300px; margin-left: auto; margin-top: 20px; }
          .totals-table td { padding: 8px 4px; }
          .total-row { font-size: 18px; font-weight: 700; color: #0f172a; border-top: 2px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="flex justify-between">
            <div>
              <h1 class="header-title">${business.name}</h1>
              ${business.phone ? `<p style="margin: 4px 0; color: #64748b;">Phone: ${business.phone}</p>` : ''}
              ${business.address ? `<p style="margin: 4px 0; color: #64748b;">${business.address}</p>` : ''}
            </div>
            <div class="text-right">
              <h2 style="margin: 0 0 8px 0; color: #64748b; font-weight: 500;">INVOICE</h2>
              <p style="margin: 4px 0;"><b>Invoice No:</b> INV-${Date.now()}</p>
              <p style="margin: 4px 0;"><b>Date:</b> ${new Date().toLocaleDateString("en-IN")}</p>
            </div>
          </div>
          
          <div class="divider" style="border-top: 1px solid #e2e8f0; margin: 24px 0;"></div>
 
          <div class="grid">
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; color: #64748b;">Billed To</h3>
              <p style="margin: 0; font-size: 16px; font-weight: 600;">${selectedTable.customerName || "Walk-in Customer"}</p>
            </div>
            <div class="text-right">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; color: #64748b;">Game Session</h3>
              <p style="margin: 4px 0;"><b>Table:</b> ${selectedTable.name} (${selectedTable.type})</p>
              <p style="margin: 4px 0;"><b>Total Play Duration:</b> ${timeLabel(bill.seconds)}</p>
            </div>
          </div>
 
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: center;">Qty / Duration</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${matchRows}
              ${rows}
            </tbody>
          </table>

          <table class="totals-table">
            <tr>
              <td style="color: #64748b;">Subtotal:</td>
              <td class="text-right" style="font-weight: 500;">${formatMoney(bill.subtotal, business.currency)}</td>
            </tr>
            ${bill.gst > 0 ? `
            <tr>
              <td style="color: #64748b;">GST (${business.gstPercent}%):</td>
              <td class="text-right" style="font-weight: 500;">${formatMoney(bill.gst, business.currency)}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td>Total Due:</td>
              <td class="text-right">${formatMoney(bill.total, business.currency)}</td>
            </tr>
          </table>

          <div style="margin-top: 60px; text-align: center; color: #64748b; font-size: 14px;">
            <p>Payment Mode: <b>${paymentMode}</b></p>
            <p style="margin-top: 20px; font-style: italic;">Thank you for your business!</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
      </html>
    `;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  }


  function exportBillsCSV() {
    const headers = ["Bill ID", "Date", "Customer", "Table", "Play Time", "Payment", "Table Amount", "Item Amount", "GST", "Total"];
    const lines = app.bills.map((b) => [
      b.id,
      `"${b.date}"`,
      `"${b.customerName || "Walk-in"}"`,
      `"${b.table}"`,
      `"${displayBillTime(b)}"`,
      `"${b.paymentMode}"`,
      Math.round(b.tableAmount),
      Math.round(b.itemAmount),
      Math.round(b.gst),
      Math.round(b.total)
    ].join(","));
    const csv = "\uFEFF" + [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = "snooker-pos-bills-detailed.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }


  function exportDailySalesReport() {
    const dayGroups = {};
    app.bills.forEach((b) => {
      const day = b.day;
      if (!dayGroups[day]) {
        dayGroups[day] = {
          day,
          count: 0,
          seconds: 0,
          tableAmount: 0,
          itemAmount: 0,
          gst: 0,
          total: 0,
        };
      }
      const group = dayGroups[day];
      group.count += 1;
      group.seconds += b.seconds || (b.minutes ? b.minutes * 60 : 0);
      group.tableAmount += b.tableAmount;
      group.itemAmount += b.itemAmount;
      group.gst += b.gst;
      group.total += b.total;
    });

    const headers = [
      "Date",
      "Total Bills",
      "Total Play Duration",
      "Table Sales",
      "Cafe Sales",
      "GST",
      "Total Revenue"
    ];

    const lines = Object.values(dayGroups).map((g) => [
      `"${g.day}"`,
      g.count,
      `"${timeLabel(g.seconds)}"`,
      Math.round(g.tableAmount),
      Math.round(g.itemAmount),
      Math.round(g.gst),
      Math.round(g.total)
    ].join(","));

    const csv = "\uFEFF" + [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = "snooker-pos-daily-sales.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }


  function printReceipt() {
    const business = app.business;
    const rate = Number(business.rates?.[selectedTable.id] ?? 300);
    
    let discountAmt = 0;
    if (discountType === "Amount") discountAmt = Number(discountValue) || 0;
    else if (discountType === "Percent") discountAmt = bill.total * ((Number(discountValue) || 0) / 100);
    const finalTotal = Math.max(0, bill.total - discountAmt);

    let matchRows = "";
    if (selectedTable.matches && selectedTable.matches.length > 0) {
      matchRows += selectedTable.matches.map(m => `
        <tr>
          <td style="padding: 4px 0;">
            <div>${m.details.matchName || 'Match'} (${timeLabel(m.seconds)})</div>
            ${m.details.player1 && m.details.player2 ? `<div style="font-size: 10px; color: #555;">${m.details.player1} vs ${m.details.player2}</div>` : ''}
            ${m.details.winner ? `<div style="font-size: 10px; font-weight: bold;">Winner: ${m.details.winner}</div>` : ''}
          </td>
          <td class="text-right" style="padding: 4px 0; vertical-align: top;">${formatMoney((m.seconds / 3600) * rate, business.currency)}</td>
        </tr>
      `).join("");
    }
    const activeSeconds = getMatchSeconds(selectedTable.activeMatch, Date.now());
    if (activeSeconds > 0) {
      matchRows += `
        <tr>
          <td style="padding: 4px 0;">Ongoing Match (${timeLabel(activeSeconds)})</td>
          <td class="text-right" style="padding: 4px 0;">${formatMoney((activeSeconds / 3600) * rate, business.currency)}</td>
        </tr>
      `;
    }

    const rows = selectedTable.items.map((item) => `
      <tr>
        <td style="padding: 4px 0;">${item.name} x ${item.qty}</td>
        <td style="text-align: right; padding: 4px 0;">${formatMoney(item.price * item.qty, business.currency)}</td>
      </tr>
    `).join("");
    
    const html = `
      <html>
      <head>
        <title>Receipt - ${selectedTable.name}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { font-family: 'Courier New', Courier, monospace; width: 72mm; margin: 0 auto; padding: 10px 0; font-size: 12px; line-height: 1.4; color: #000; }
          .text-center { text-align: center; } .text-right { text-align: right; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .header { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="header">${business.name}</div>
          ${business.phone ? `<div>Phone: ${business.phone}</div>` : ''}
          ${business.address ? `<div>${business.address}</div>` : ''}
        </div>
        <div class="divider"></div>
        <div>
          <div><b>Receipt ID:</b> REC-${Date.now()}</div>
          <div><b>Date:</b> ${new Date().toLocaleString("en-IN")}</div>
          <div><b>Table:</b> ${selectedTable.name}</div>
          <div><b>Customer:</b> ${selectedTable.customerName || "Walk-in"}</div>
          <div><b>Total Play:</b> ${timeLabel(bill.seconds)}</div>
        </div>
        <div class="divider"></div>
        <table>
          <thead><tr style="border-bottom: 1px dashed #000;"><th style="text-align: left;">Item</th><th style="text-align: right;">Amount</th></tr></thead>
          <tbody>${matchRows}${rows}</tbody>
        </table>
        <div class="divider"></div>
        <table>
          <tr><td>Subtotal:</td><td class="text-right">${formatMoney(bill.subtotal, business.currency)}</td></tr>
          ${bill.gst > 0 ? `<tr><td>GST (${business.gstPercent}%):</td><td class="text-right">${formatMoney(bill.gst, business.currency)}</td></tr>` : ''}
          ${discountAmt > 0 ? `<tr><td>Discount (${discountType}):</td><td class="text-right">-${formatMoney(discountAmt, business.currency)}</td></tr>` : ''}
          <tr style="font-size: 14px; font-weight: bold;"><td>TOTAL:</td><td class="text-right">${formatMoney(finalTotal, business.currency)}</td></tr>
        </table>
        ${isSplitBill && splitNames.trim() ? `<div class="divider"></div><div><b>Split Between:</b> ${splitNames}</div>` : ''}
        <div class="divider"></div>
        <div class="text-center"><div>Paid via ${paymentMode}</div><div style="margin-top: 8px; font-size: 10px;">Thank you for your visit!</div></div>
        <script>window.onload=function(){window.print();setTimeout(function(){window.close();},500)}</script>
      </body></html>`;
    const win = window.open("", "_blank"); win.document.write(html); win.document.close();
  }

  // Calculate Cafe Sales
  const cafeSalesData = app.bills.filter(b => {
    try {
      const [d, m, y] = b.day.split('/');
      const billDate = new Date(`${y}-${m}-${d}`);
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
                      <button key={table.id} onClick={() => setSelectedTableId(table.id)} className={`rounded-2xl border p-4 text-left transition hover:shadow-md ${active ? "border-slate-950 bg-white shadow-md" : "bg-white"}`}>
                        <div className="flex items-center justify-between gap-1">
                          <div>
                            <p className="font-semibold text-sm sm:text-base">{table.name}</p>
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${table.type === 'Snooker' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>{table.type}</span>
                          </div>
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
                    <Button className="rounded-2xl" variant="outline" onClick={printReceipt} disabled={bill.total <= 0}><Printer className="mr-2 h-4 w-4" /> Print</Button>
                  </div>
                  
                  <div className="rounded-2xl bg-slate-100 p-4">
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div><p className="text-xs text-slate-500">Time</p><p className="text-xl font-bold font-mono">{timeLabel(bill.seconds)}</p></div>
                      <div><p className="text-xs text-slate-500">Rate</p><p className="text-xl font-bold">{formatMoney(app.business.rates?.[selectedTableId] ?? 300, app.business.currency)}/hr</p></div>
                      <div><p className="text-xs text-slate-500">Table</p><p className="text-xl font-bold">{formatMoney(bill.tableAmount, app.business.currency)}</p></div>
                      <div><p className="text-xs text-slate-500">Total</p><p className="text-xl font-bold">{formatMoney(bill.total, app.business.currency)}</p></div>
                    </div>
                  </div>

                  <div className="relative flex items-center"><Search className="absolute left-3 h-4 w-4 text-slate-400" /><Input className="rounded-2xl pl-9" placeholder="Search menu..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>

                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {filteredMenu.map((item) => (
                      <Button key={item.id} variant="outline" className="h-auto rounded-2xl p-3 text-left block" onClick={() => addItemToBill(item)} disabled={Number(item.stock) <= 0}>
                        <span className="block w-full text-left"><span className="block font-semibold truncate">{item.name}</span><span className="text-xs text-slate-500 block">{formatMoney(item.price, app.business.currency)}</span></span>
                      </Button>
                    ))}
                  </div>

                  <div className="grid grid-cols-[1fr_110px_auto] gap-2">
                    <Input className="rounded-2xl" placeholder="Custom item" value={customName} onChange={(e) => setCustomName(e.target.value)} />
                    <Input className="rounded-2xl" type="number" placeholder="Price" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} />
                    <Button className="rounded-2xl" onClick={addCustomItem}><Plus className="h-4 w-4" /></Button>
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
                      <Input className="h-8 rounded-lg" type="number" placeholder="Discount" value={discountValue} onChange={e => setDiscountValue(e.target.value)} />
                      <Button variant="outline" className="h-8" onClick={() => setDiscountType(discountType === "Amount" ? "Percent" : "Amount")}>{discountType === "Amount" ? "₹ Amt" : "% Pct"}</Button>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="split-bill" checked={isSplitBill} onChange={e => setIsSplitBill(e.target.checked)} className="h-4 w-4" />
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

                  <div className="grid grid-cols-3 gap-2">{["UPI", "Cash", "Card"].map((mode) => <Button key={mode} className="rounded-2xl" variant={paymentMode === mode ? "default" : "outline"} onClick={() => setPaymentMode(mode)}>{mode}</Button>)}</div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button className="rounded-2xl text-xs py-3" variant="outline" onClick={printReceipt} disabled={bill.total <= 0}><Printer className="mr-1.5 h-3.5 w-3.5" /> Receipt</Button>
                    <Button className="rounded-2xl text-xs py-3" variant="outline" onClick={exportInvoicePDF} disabled={bill.total <= 0}><Download className="mr-1.5 h-3.5 w-3.5" /> Export PDF</Button>
                  </div>
                  <Button className="w-full rounded-2xl py-6 text-lg" onClick={checkout} disabled={bill.total <= 0}><IndianRupee className="mr-2 h-5 w-5" /> Checkout</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Sales Reports</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Button className="rounded-2xl text-xs" variant="outline" onClick={exportBillsCSV}><Download className="mr-1.5 h-3.5 w-3.5" /> Export Detailed CSV</Button>
                    <Button className="rounded-2xl text-xs font-semibold" variant="outline" onClick={exportDailySalesReport}><Download className="mr-1.5 h-3.5 w-3.5" /> Export Daily Sales (Excel)</Button>
                  </div>
                </div>
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="summary">Bill Summary</TabsTrigger>
                    <TabsTrigger value="cafe">Cafe Sales</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="summary" className="pt-4">
                    <div className="overflow-hidden rounded-2xl border bg-white"><table className="w-full text-sm"><thead className="bg-slate-100 text-left"><tr><th className="p-3">Bill</th><th className="p-3">Date</th><th className="p-3">Table</th><th className="p-3">Payment</th><th className="p-3">Discount</th><th className="p-3">Total</th></tr></thead><tbody>{app.bills.map((b) => <tr key={b.id} className="border-t"><td className="p-3">{b.id}</td><td className="p-3">{b.date}</td><td className="p-3">{b.table || b.tableName}</td><td className="p-3">{b.paymentMode}</td><td className="p-3">{b.discountAmount > 0 ? `${formatMoney(b.discountAmount, app.business.currency)} (${b.discountType})` : '-'}</td><td className="p-3">{formatMoney(b.total, app.business.currency)}</td></tr>)}</tbody></table></div>
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
          
          <TabsContent value="settings" className="space-y-6">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Business Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label>Business name</Label><Input className="rounded-2xl" value={app.business.name} onChange={(e) => updateBusiness("name", e.target.value)} /></div>
                    <div className="space-y-2"><Label>Phone</Label><Input className="rounded-2xl" value={app.business.phone} onChange={(e) => updateBusiness("phone", e.target.value)} /></div>
                    <div className="space-y-2 md:col-span-2"><Label>Address</Label><Input className="rounded-2xl" value={app.business.address} onChange={(e) => updateBusiness("address", e.target.value)} /></div>
                    <div className="space-y-2"><Label>GST percent</Label><Input className="rounded-2xl" type="number" value={app.business.gstPercent} onChange={(e) => updateBusiness("gstPercent", Number(e.target.value))} /></div>
                    <div className="space-y-2"><Label>Currency symbol</Label><Input className="rounded-2xl" value={app.business.currency} onChange={(e) => updateBusiness("currency", e.target.value)} /></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Admin Authentication</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label>Admin Username</Label><Input className="rounded-2xl" value={app.business.adminUsername || ''} onChange={(e) => updateBusiness("adminUsername", e.target.value)} /></div>
                    <div className="space-y-2"><Label>Admin Password</Label><Input className="rounded-2xl" value={app.business.adminPassword || ''} onChange={(e) => updateBusiness("adminPassword", e.target.value)} /></div>
                  </div>
                  <p className="text-xs text-slate-500">Note: The master password (admin / admin) will always work as a fallback.</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Table Management</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {app.tables.map(t => (
                      <div key={t.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border">
                        <div className="flex-1 font-medium">{t.name} <span className="text-xs text-slate-500 font-normal ml-2 bg-slate-200 px-2 py-0.5 rounded-md">{t.type}</span></div>
                        <div className="w-32 flex items-center gap-2">
                          <Label className="whitespace-nowrap">Rate/hr:</Label>
                          <Input className="h-8 rounded-lg" type="number" value={app.business.rates?.[t.id] ?? 300} onChange={(e) => updateBusinessRate(t.id, Number(e.target.value))} />
                        </div>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteTable(t.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t">
                    <Label className="mb-2 block">Add New Table</Label>
                    <div className="flex gap-3 items-end">
                      <div className="space-y-1 flex-1"><Label className="text-xs text-slate-500">Name</Label><Input className="h-9 rounded-xl" placeholder="e.g. Snooker 3" value={newTableName} onChange={e => setNewTableName(e.target.value)} /></div>
                      <div className="space-y-1 w-32"><Label className="text-xs text-slate-500">Type</Label>
                        <select className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors" value={newTableType} onChange={e => setNewTableType(e.target.value)}>
                          <option value="Snooker">Snooker</option>
                          <option value="Pool">Pool</option>
                          <option value="Billiards">Billiards</option>
                        </select>
                      </div>
                      <div className="space-y-1 w-24"><Label className="text-xs text-slate-500">Rate/hr</Label><Input type="number" className="h-9 rounded-xl" value={newTableRate} onChange={e => setNewTableRate(e.target.value)} /></div>
                      <Button className="h-9 rounded-xl" onClick={handleAddTable}>Add</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm border-red-200 bg-red-50/50">
                <CardHeader><CardTitle className="flex items-center gap-2 text-red-600"><Trash2 className="h-5 w-5" /> Danger Zone</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-red-600/80 mb-4">Resetting the system will permanently delete all past bills and terminate any currently active matches. This action cannot be undone.</p>
                  <Button variant="destructive" className="rounded-xl shadow-sm" onClick={handleFactoryReset}>Factory Reset Data</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

      {endingMatchTableId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-lg rounded-3xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="pb-3 border-b mb-3">
              <CardTitle className="text-xl">End Match details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="space-y-1"><Label className="text-xs text-slate-500">Match Name</Label><Input className="rounded-xl h-9" value={matchForm.matchName} onChange={(e) => setMatchForm({ ...matchForm, matchName: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs text-slate-500">Player 1</Label><Input className="rounded-xl h-9" value={matchForm.player1} onChange={(e) => setMatchForm({ ...matchForm, player1: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs text-slate-500">Player 2</Label><Input className="rounded-xl h-9" value={matchForm.player2} onChange={(e) => setMatchForm({ ...matchForm, player2: e.target.value })} /></div>
              </div>
              <div className="space-y-1"><Label className="text-xs text-slate-500">Extra Players (Optional)</Label><Input className="rounded-xl h-9" value={matchForm.extraPlayers} onChange={(e) => setMatchForm({ ...matchForm, extraPlayers: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs text-slate-500">Winner</Label><Input className="rounded-xl h-9" value={matchForm.winner} onChange={(e) => setMatchForm({ ...matchForm, winner: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs text-slate-500">Loser</Label><Input className="rounded-xl h-9" value={matchForm.loser} onChange={(e) => setMatchForm({ ...matchForm, loser: e.target.value })} /></div>
              </div>
              <div className="space-y-1"><Label className="text-xs text-slate-500">Payer Name</Label><Input className="rounded-xl h-9" value={matchForm.payer} onChange={(e) => setMatchForm({ ...matchForm, payer: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs text-slate-500">Notes</Label><Input className="rounded-xl h-9" value={matchForm.notes} onChange={(e) => setMatchForm({ ...matchForm, notes: e.target.value })} /></div>
              <div className="flex justify-end gap-3 pt-3 mt-4 border-t">
                <Button variant="ghost" className="rounded-xl" onClick={cancelEndMatch}>Cancel</Button>
                <Button className="rounded-xl" onClick={saveMatch}>Save Match</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

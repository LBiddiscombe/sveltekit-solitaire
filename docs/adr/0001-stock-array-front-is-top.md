# Stock array convention: index 0 is the top (drawn first)

Klondike's draw and deal mechanics had a subtle bug: after recycling the waste pile, batches of 3 appeared reversed in the waste. Root cause was a mismatch in how the stock array's "top" was defined — the deal animation and `dealCardToTableau` accessed `stock[0]` as the top (using `shift()`), but `drawFromStock` used `splice(-count)` from the end. After recycling, `waste.reverse()` compounded this into "each batch of 3 reversed."

We fixed both directions to use a single convention: **index 0 is the top of the stock, drawn first**. Changed `drawFromStock` to use `splice(0, count)` and removed the `.reverse()` on recycling to preserve the waste display order.

**Status**: accepted

**Considered Options**:

- **Go the other way (index last = top):** Would have required changing `dealCardToTableau` from `shift()` to `pop()`, and the deal animation from `stock[0]` to `stock[stock.length-1]` — more surface area, more risk. The existing deal flow already established index-0-as-top, so we aligned draw/recycle with it.

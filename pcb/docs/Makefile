# pcb/docs/Makefile
# Build SEW white paper HTML and PDF from markdown source.
#
#   make html   — whitepaper.html (standalone, with CSS)
#   make pdf    — whitepaper.pdf (via wkhtmltopdf)
#   make all    — both
#   make clean  — remove generated assets

PANDOC  := pandoc
WK      := wkhtmltopdf
SRC     := whitepaper.md
HTML    := whitepaper.html
PDF     := whitepaper.pdf
CSS     := whitepaper.css

.PHONY: all html pdf clean

all: html pdf

html: $(SRC) $(CSS)
	$(PANDOC) $(SRC) -o $(HTML) \
	  --standalone \
	  --css $(CSS) \
	  --metadata title="SEW: Symmetric Embedding Workbench"
	@echo "==> $(HTML)"

pdf: html
	$(WK) --enable-local-file-access --quiet $(HTML) $(PDF)
	@echo "==> $(PDF)  ($$(du -h $(PDF) | cut -f1))"

clean:
	rm -f $(HTML) $(PDF)
	@echo "Cleaned whitepaper assets."

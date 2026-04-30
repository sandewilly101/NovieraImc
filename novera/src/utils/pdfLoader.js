
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfjsLib = null;

async function initPdfJs() {
    if (pdfjsLib) return pdfjsLib;

    if (window.pdfjsLib) {
        pdfjsLib = window.pdfjsLib;
        return pdfjsLib;
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = PDFJS_CDN;
        script.onload = () => {
            pdfjsLib = window.pdfjsLib;
            pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
            resolve(pdfjsLib);
        };
        script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'));
        document.head.appendChild(script);
    });
}

export async function renderPdfToImage(file) {
    const lib = await initPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;

    const textContent = await page.getTextContent();
    const extractedDimensions = [];

    const dimRegex = /(\d+(\.\d+)?)\s*(m|cm|mm|ft|in|')|door|entrance|window/gi;

    textContent.items.forEach(item => {
        const text = item.str.trim();
        if (!text) return;

        const match = text.match(dimRegex);
        if (match) {
            // PDF coordinates are from bottom-left [item.transform[4], item.transform[5]]
            // Viewport dimensions are viewport.width, viewport.height
            // We want normalized [0, 1] coordinates where [0,0] is top-left for 3D mapping
            const tx = item.transform[4] / (viewport.width / 2.5); // Use original page points
            const ty = (viewport.height / 2.5 - item.transform[5]) / (viewport.height / 2.5);

            extractedDimensions.push({
                label: text,
                pdfPos: [tx / (viewport.width / 2.5), ty] // Normalized 0-1
            });
        }
    });

    // Final normalized positions for the store
    const normalizedDimensions = textContent.items
        .filter(item => item.str.trim().match(dimRegex))
        .map(item => {
            const pageWidth = viewport.width / 2.5;
            const pageHeight = viewport.height / 2.5;
            return {
                label: item.str.trim(),
                x: item.transform[4] / pageWidth,
                y: 1 - (item.transform[5] / pageHeight) // 1 - y because PDF is bottom-up
            };
        });

    const url = canvas.toDataURL('image/png');

    return {
        url,
        width: viewport.width,
        height: viewport.height,
        aspectRatio: viewport.width / viewport.height,
        extractedDimensions: normalizedDimensions
    };
}

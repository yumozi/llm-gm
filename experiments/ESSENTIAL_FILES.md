# Essential Experiment Files

This document lists the **minimum set of files** needed to run experiments.

## For RAG Experiments (Python)

### Core Files (Required)
```
experiments/
├── rag_experiments.ipynb    # ⭐ MAIN - Run this notebook
├── config.py                # ⭐ Configuration settings
├── test_scenarios.json      # ⭐ Test data
├── requirements.txt         # ⭐ Python dependencies
└── utils/                   # ⭐ Helper modules
    ├── rag_simulator.py
    └── metrics.py
```

### Generated Files (Created after running)
```
experiments/
└── results/
    ├── baseline_comparison.csv
    ├── ablation_*.csv
    ├── statistical_analysis.txt
    └── plots/
```

### Quick Start
```bash
cd experiments
pip install -r requirements.txt
jupyter notebook rag_experiments.ipynb
```

---

## For Function Calling Experiment (TypeScript)

### Core File (Required)
```
experiments/
└── function-calling.ts      # ⭐ MAIN - Standalone experiment
```

### Quick Start
```bash
npm run experiment 5         # Run 5 trials
```

---

## Supporting Files (Optional)

These files help set up test data but are not required to run experiments:

```
experiments/
├── add_entities.py              # Populate test world with entities
├── add_rules_only.py            # Add rules to existing world
├── expand_test_world.py         # Expand test world data
├── inspect_prompts.py           # Debug prompts
├── test_latency.py              # Test system latency
└── regenerate_threshold_plot.py # Regenerate specific plots
```

---

## Minimum Setup Checklist

### For RAG Experiments
- [ ] Python 3.8+ installed
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Jupyter installed (included in requirements.txt)
- [ ] Supabase credentials in `.env` file
- [ ] OpenAI API key in `.env` file
- [ ] "RAG Test World" exists in database (or create one)

### For Function Calling Experiment
- [ ] Node.js 18+ installed
- [ ] Dependencies installed: `npm install`
- [ ] OpenAI API key in `.env` file
- [ ] Migrations applied (especially prompt-related migrations)

---

## File Size Reference

| File | Size | Purpose |
|------|------|---------|
| `rag_experiments.ipynb` | ~36 KB | Main experiment logic |
| `function-calling.ts` | ~10 KB | Function calling test |
| `config.py` | ~3 KB | Configuration |
| `test_scenarios.json` | ~2 KB | Test data |
| `requirements.txt` | <1 KB | Dependencies |

**Total essential size: ~50 KB** (excluding dependencies and results)

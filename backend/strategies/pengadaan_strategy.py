# strategies/pengadaan_strategy.py
from typing import Dict, Any, List, Optional
from .base import DocumentStrategy

class PengadaanStrategy(DocumentStrategy):
    """Strategy for PENGADAAN document type"""

    def get_payment_config(self) -> Dict[str, Any]:
        return {
            'show_termins': True,
            'allow_multiple': True,
            'fixed_payment': None
        }

    def format_payment_content(self, data: Dict[str, Any]) -> Optional[str]:
        payment_terms = data.get('payment_terms', {})

        # Collect all termins
        termins = []
        termin_keys = sorted(
            [k for k in payment_terms.keys() if k.startswith('termin_') and k.endswith('_percent')],
            key=lambda x: int(x.split('_')[1])
        )

        for key in termin_keys:
            termin_num = key.split('_')[1]
            percent = payment_terms.get(f'termin_{termin_num}_percent', '')
            condition = payment_terms.get(f'termin_{termin_num}_condition', '')

            if percent:
                termins.append({
                    'number': int(termin_num),
                    'percentage': percent,
                    'condition': condition
                })

        if not termins:
            return None

        # Roman numeral converter
        def to_roman(n):
            roman_numerals = {
                1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
                6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X'
            }
            return roman_numerals.get(n, str(n))

        # Format payment content
        content = "Pembayaran dilakukan dengan:"
        for termin in termins:
            roman = to_roman(termin['number'])
            condition_text = f" ({termin['condition']})" if termin['condition'] else ""
            content += f"\n- Termin {roman} sebesar {termin['percentage']}%{condition_text}"

        content += "\n\nPembayaran dilakukan sesuai ketentuan yang berlaku di PT Terminal Petikemas Surabaya"
        return content

    def format_work_activities(self, activities: List[str], data: Dict[str, Any] = None) -> str:
        if not activities:
            return "- Pekerjaan ini belum didefinisikan"

        formatted = []
        for i, activity in enumerate(activities, 1):
            formatted.append(f"{i}. {activity}")
        return '\n'.join(formatted)

    def get_work_activity_examples(self) -> str:
        return """Examples for PENGADAAN work activities:
- Melakukan pengadaan kabel fiber optic beserta peripheral pendukung
- Melakukan instalasi central panel khusus kebutuhan koneksi FO QCC di Gedung CBO Lt.2
- Melakukan instalasi, splicing, labeling dan uji koneksi (OTDR) seluruh core fiber optic"""

    def get_template_name(self, doc_type: str) -> str:
        return "pengadaan"  # Base name only, load_template adds prefix

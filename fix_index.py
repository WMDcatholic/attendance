
import os

file_path = 'c:/github/attendance/index.html'
debug_path = 'c:/github/attendance/debug.log'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    target_line = '    <!-- Edit Mass Time Modal -->\n'
    start_idx = -1
    
    # Search for the line
    for i, line in enumerate(lines):
        if '<!-- Edit Mass Time Modal -->' in line:
            # Check if it's the one around line 315 (not the one at the end)
            if i < 400: 
                start_idx = i
                break
    
    if start_idx == -1:
        with open(debug_path, 'w', encoding='utf-8') as f:
            f.write("Target line not found in first 400 lines.\n")
        exit(1)

    with open(debug_path, 'w', encoding='utf-8') as f:
        f.write(f"Found target at line {start_idx+1}: {lines[start_idx]}")

    # We want to replace from start_idx to start_idx + 6 (to cover the broken block)
    # The broken block is roughly 6 lines: comment, div, div, h3, div.
    # And we want to insert the scheduleGenerationView header.
    
    new_content = """            <section id="scheduleGenerationView" class="app-view p-6 bg-white rounded-lg shadow-lg hidden">
                <h2 class="text-xl font-semibold mb-4 text-sky-700">일정생성</h2>
                <div class="space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label for="schedule-year" class="block text-sm font-medium text-slate-700">년도:</label>
                            <input type="number" id="schedule-year" name="schedule-year"
                                class="mt-1 block w-full py-2 px-3 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                                placeholder="YYYY">
                        </div>
                        <div>
                            <label for="schedule-month" class="block text-sm font-medium text-slate-700">월:</label>
                            <select id="schedule-month" name="schedule-month"
                                class="mt-1 block w-full py-2 px-3 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm">
                                <option value="">월 선택</option>
                                <option value="1">1월</option>
                                <option value="2">2월</option>
                                <option value="3">3월</option>
                                <option value="4">4월</option>
                                <option value="5">5월</option>
                                <option value="6">6월</option>
"""
    
    # Replace 6 lines
    lines[start_idx:start_idx+6] = [new_content]

    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)

    with open(debug_path, 'a', encoding='utf-8') as f:
        f.write("Successfully updated index.html\n")

except Exception as e:
    with open(debug_path, 'w', encoding='utf-8') as f:
        f.write(f"Exception: {str(e)}\n")
    exit(1)

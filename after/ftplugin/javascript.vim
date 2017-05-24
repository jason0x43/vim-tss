if !g:tss_js
	finish
endif

if exists('js_loaded')
	finish
endif
let js_loaded = 1

let g:neomake_javascript_tss_maker = {
		\ 'exe': 'node',
		\ 'args': [expand('<sfile>:p:h') . '/../../bin/errors.js'],
        \ 'errorformat':
            \ '%E%f %#(%l\,%c): error TS%n: %m,' .
            \ '%C%\s%\+%m'
        \ }

let default_makers = neomake#makers#ft#javascript#EnabledMakers()
let current_makers = get(g:, 'neomake_javascript_enabled_makers', default_makers)
if index(current_makers, 'tss') == -1
	let g:neomake_javascript_enabled_makers = current_makers + ['tss']
endif

call tss#init()

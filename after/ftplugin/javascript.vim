if !get(g:, 'tss_js', 0)
	finish
endif

call tss#init()

if exists('g:tss_js_type_loaded')
	finish
endif
let g:tss_js_type_loaded = 1

if exists('g:loaded_neomake')
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
endif

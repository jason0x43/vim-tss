if !g:tss_js
	finish
endif

let g:neomake_javascript_tss_maker = {
		\ 'exe': 'node',
		\ 'args': [expand('<sfile>:p:h') . '/../bin/errors.js'],
        \ 'errorformat':
            \ '%E%f %#(%l\,%c): error TS%n: %m,' .
            \ '%C%\s%\+%m'
        \ }

let g:neomake_javascript_enabled_makers = ['jshint', 'tss']

call tss#init()

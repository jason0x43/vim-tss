let s:path = expand('<sfile>:p:h')
let s:startup_file = ''
let s:ready = 0
let s:job_names = {}

" Notify tsserver that a file is no longer being edited
function! tss#closeFile(file)
	if &filetype == 'javascript' && !g:tss_js 
		return 
	endif

	call tss#debug('Closing', a:file)
	let job = jobstart(['node', s:path . '/../bin/close.js', a:file], {
		\ 'on_exit': function('s:exitHandler')
		\ })
	let s:job_names[job] = 'Close ' . a:file
endfunction

function! tss#completions(file, line, offset, ...)
	let prefix = a:0 > 0 ? (' ' . shellescape(a:1)) : ''
	let ignoreCase = g:tss_completion_ignore_case ? ' -i' : ''

	" Ensure tsserver view of file is up-to-date
	call s:reloadFile(a:file)

	call tss#debug('Getting completions for', a:file)
	let output = system('node ' .
		\ shellescape(s:path . '/../bin/completions.js') . ignoreCase . ' ' .
		\ shellescape(a:file) . ' ' . a:line . ' ' . a:offset . prefix)

	return json_decode(output)
endfunction

" Log a debug message
function! tss#debug(...)
	if g:tss_verbose
		echom('TSS: ' . join(a:000, ' '))
	endif
endfunction

" Populate the location list with the locations of definitions of the symbol
" at the current cursor position
function! tss#definition()
	call s:getLocations('definition')
endfunction

" Log an error message
function! tss#error(message)
	if g:tss_verbose
		echoe('TSS: ' . a:message)
	endif
endfunction

" Populate the quickfix list with errors for the current buffer 
function! tss#errors()
	" Clear the quickfix list
	call setqflist([], 'r')

	let file = expand('%')

	" Ensure tsserver view of file is up-to-date
	call s:reloadFile(file)

	call tss#debug('Getting errors for ' . file)
	let lines = systemlist('node ' . shellescape(s:path . '/../bin/errors.js')
		\ . ' ' . shellescape(file) . ' -n')
	call tss#debug('Got ' . len(lines) . ' error lines')

	let current_err = {}

	for line in lines
		let parts = matchlist(line,
			\ '\([^(]\+\)(\(\d\+\),\(\d\+\)): error \(.*\)')
		if len(parts) > 0
			if !empty(current_err)
				" If we were filling in an error, it's done now, so add it to
				" the list
				call tss#debug('Added error to qflist')
				call setqflist([current_err], 'a')
			endif
			let current_err = {
				\ 'filename': parts[1],
				\ 'lnum': parts[2],
				\ 'col': parts[3],
				\ 'text': parts[4]
				\ }
		else 
			let current_err.text .= line
		endif
	endfor

	if !empty(current_err)
		call setqflist([current_err], 'a')
	endif

	" Open or close the qf window as necessary
	cwindow
endfunction

" Format the current buffer. This is a synchronous command because we don't
" want the user interacting with the buffer while it's being formatted.
function! tss#format()
	let file = expand('%')

	" Ensure tsserver view of file is up-to-date
	call s:reloadFile(file)

	let lines = systemlist('node ' . shellescape(s:path . '/../bin/format.js')
	call tss#debug('Formatting', file)
		\ . ' ' . shellescape(file))
	call s:format(lines)
endfunction

" Populate the location list with the locations of implementations of the
" symbol at the current cursor position
function! tss#implementation()
	call s:getLocations('implementation')
endfunction

" Initialze the plugin for a new buffer
function! tss#init()
	command! -buffer TssDefinition :call tss#definition()
	command! -buffer TssErrors :call tss#errors()
	command! -buffer TssFormat :call tss#format()
	command! -buffer TssImplementation :call tss#implementation()
	command! -buffer TssQuickInfo :call tss#quickinfo()
	command! -buffer TssReferences :call tss#references()
	command! -buffer TssStart :call tss#start()
	command! -buffer TssStop :call tss#stop()

	setlocal omnifunc=tss#omnicomplete

	if !g:tss_server_id
		call tss#start()
	endif
endfunction

" Return a list of omnicompletion entries for the current cursor position
function! tss#omnicomplete(findstart, base)
	let line = getline('.')
	let pos = getcurpos()

	let offset = pos[2]

	" Search backwards for first "iskeyword" identifier
	while offset > 0 && line[offset - 2] =~ "\\k"
		let offset -= 1
	endwhile

	if a:findstart
		return offset - 1
	else
		let file = expand('%')
		let response = tss#completions(file, pos[1], offset, a:base)

		if get(response, 'success', 0)
			let enableMenu = stridx(&completeopt, 'menu') != -1

			if enableMenu
				for comp in response.body
					call complete_add({ 'word': comp.name, 'menu': comp.kind })

					if complete_check()
						break
					endif
				endfor

				return []
			else
				return map(response.body, 'v:val.name')
			endif
		else
			let message = get(response, 'message', string(response))
			call tss#debug('Error requesting completions: ' . message)
			return []
		endif
	endif
endfunction

" Notify tsserver that a file is being edited
function! tss#openFile(file)
	if &filetype == 'javascript' && !g:tss_js 
		return 
	endif

	call tss#debug('Opening', a:file)
	let job = jobstart(['node', s:path . '/../bin/open.js', a:file], {
		\ 'on_stderr': function('s:logHandler'),
		\ 'on_exit': function('s:exitHandler')
		\ })
	let s:job_names[job] = 'Open ' . a:file
endfunction

function! tss#quickinfo()
	let file = expand('%')
	let pos = getcurpos()

	" Ensure tsserver view of file is up-to-date
	call s:reloadFile(file)

	let lines = systemlist('node ' .
	call tss#debug('Getting quick info for', file)
		\ shellescape(s:path . '/../bin/quickinfo.js') . ' ' .
		\ shellescape(file) . ' ' . pos[1] . ' ' . pos[2])

	redraw | echo(join(lines, "\n"))
endfunction

" Populate the location list with references to the symbol at the current
" cursor position
function! tss#references()
	call s:getLocations('references')
endfunction

" Called before saving a TS file
function! tss#preSave()
	if &filetype == 'javascript' && !g:tss_js 
		return 
	endif

	if g:tss_format_on_save 
		call tss#format()
	endif
endfunction 

" Start an instance of tsserver for the current TS project
function! tss#start()
	" Don't start the server if it's already running
	if g:tss_server_id
		return
	endif

	let s:startup_file = expand('<afile>')
	if s:startup_file == ''
		let s:startup_file = expand('%')
	endif

	call tss#debug('Starting server for', s:startup_file)
	let g:tss_server_id = jobstart(['node', s:path . '/../bin/start.js'], {
		\ 'on_stderr': function('s:startHandler'),
		\ 'on_exit': function('s:exitHandler')
		\ })
	let s:job_names[g:tss_server_id] = 'Server start'
endfunction

" Stop the instance of tsserver running for the current TS project
function! tss#stop()
	" Don't try to stop the server if it's not running
	if !g:tss_server_id 
		return 
	endif

	call tss#debug('Stopping server')
	let job = jobstart(['node', s:path . '/../bin/stop.js'], {
		\ 'on_stderr': function('s:logHandler'),
		\ 'on_exit': function('s:exitHandler')
		\ })
	let s:job_names[job] = 'Server stop'
endfunction 

" Handle exit messages from async jobs
function! s:exitHandler(job_id, code)
	if a:code 
		call tss#error(s:job_names[a:job_id] . ' failed: ' . a:code)
	endif

	call tss#debug(s:job_names[a:job_id], 'ended')

	if a:job_id == g:tss_server_id
		" If the server job died, clear the server ID field
		let g:tss_server_id = 0
		let s:ready = 0
	endif
endfunction

" Implement a list of formatting directives in the current window
function! s:format(lines)
	if len(a:lines) == 0
		return
	endif

	" Save properties to restore later
	let view = winsaveview()
	let mark = split(execute('silent! marks k'))
	let tmp = getreg('m')
	let oldve = &ve

	" Allow selection to be one past EOL
	set ve+=onemore

	for line in a:lines
		if line == ''
			continue
		endif

		call tss#debug('Processing format line <<<' . line . '>>>')

		let parts = matchlist(line,
			\ '\([^(]\+\)(\(\d\+\),\(\d\+\)\.\.\(\d\+\),\(\d\+\)): \(.*\)')
		if len(parts) == 0
			continue 
		endif 

		let line = parts[2]
		let offset = parts[3]
		let endLine = parts[4]
		let endOffset = parts[5]

		" Delete the text from (line,offset)..(endLine,endOffset)
		call cursor(endLine, endOffset)
		:normal mk
		call cursor(line, offset)
		:normal d`k
		call tss#debug('Deleted text from (' . line . ',' . offset . ') to ('
			\ . endLine . ',' . endOffset . ')')

		" If there's new content, paste it into the buffer
		if parts[6] != ''
			call setreg('m', parts[6])
			let @m = parts[6]
			:normal "mP
			call tss#debug('Inserted "' . parts[6] . '" at (' . line . ',' .
				\ offset . ')')
		endif
	endfor

	" Restore the mark if it previously existed, or delete it
	if mark[0] == 'mark'
		call cursor(mark[5], mark[6])
		:normal mk
	else 
		:normal delmarks k
	endif

	"Restore other saved settings
	let &ve = oldve
	call setreg('m', tmp)
	call winrestview(view)
endfunction 

" Display messages from a process
function! s:logHandler(job_id, data)
	call tss#debug('Log:', join(a:data))
endfunction 

" Handle tsserver startup messages
function! s:startHandler(job_id, data)
	call s:logHandler(a:job_id, a:data)

	if s:ready 
		return 
	endif

	let data = join(a:data)
	if data =~ 'Listening on'
		let s:ready = 1
		call tss#debug('Server started')

		" After the server starts, open the current file
		if s:startup_file != ''
			call tss#debug('Opening initial file', s:startup_file)
			call tss#openFile(s:startup_file)
		endif
	endif
endfunction

" Notify tsserver that a file has new data
function! s:reloadFile(file)
	call execute('w !node ' . shellescape(s:path . '/../bin/reload.js') . ' ' .
		\ shellescape(a:file))
	call tss#debug('Reloading', a:file)
endfunction

" Populate the location list with {references, definitions, implementations}
function! s:getLocations(type)
	" Clear the loclist
	call setloclist(0, [], 'r')

	let file = expand('%')
	let pos = getcurpos()

	" Ensure tsserver view of file is up-to-date
	call s:reloadFile(file)

	let lines = systemlist('node ' . shellescape(s:path . '/../bin/' . a:type
	call tss#debug('Finding', a:type)
		\ . '.js') . ' ' . shellescape(file) . ' ' . pos[1] . ' ' . pos[2])
	call tss#debug('Got ' . len(lines) . ' lines')

	if lines[0] == 'No results'
		echom('No results')
		return
	endif

	for line in lines 
		let parts = matchlist(line, '\([^(]\+\)(\(\d\+\),\(\d\+\)): \(.*\)')
		if len(parts) == 0
			call tss#debug('Invalid location line: "' . line . '"')
			continue
		endif 

		call setloclist(0, [{
			\ 'filename': parts[1],
			\ 'lnum': parts[2],
			\ 'col': parts[3],
			\ 'text': parts[4]
			\ }], 'a')
	endfor

	" Jump to the first item in the list
	ll 1
endfunction 


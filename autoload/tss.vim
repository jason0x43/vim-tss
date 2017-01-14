let s:path = expand('<sfile>:p:h')
let s:job_names = {}
let s:open_files = {}
let s:opening_files = {}
let s:closing_files = {}

" Notify tsserver that a file is no longer being edited
function! tss#closeFile(file)
	if &filetype == 'javascript' && !g:tss_js
		return
	endif

	call s:debug('Closing', a:file)
	let job = jobstart(['node', s:path . '/../bin/close.js', a:file], {
		\ 'on_exit': function('s:closeFileHandler')
		\ })
	let s:job_names[job] = 'Close ' . a:file
	let s:closing_files[job] = a:file
endfunction

" Populate the location list with the locations of definitions of the symbol
" at the current cursor position
function! tss#definition()
	call s:getLocations('definition')
endfunction

" Populate the quickfix list with errors for the current buffer
function! tss#errors()
	" Clear the quickfix list
	call setqflist([], 'r')

	let file = expand('%')

	" Ensure tsserver view of file is up-to-date
	call s:reloadFile(file)

	call s:debug('Getting errors for', file)
	let output = system('node ' . shellescape(s:path . '/../bin/errors.js')
		\ . ' ' . shellescape(file) . ' -n -j')
	let response = json_decode(output)
	call s:debug('Got errors response:', response)

	if get(response, 'success', 0)
		call setqflist(s:toLoclistEntries(response.body), 'a')
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

	call s:debug('Formatting', file)
	let output = system('node ' . shellescape(s:path . '/../bin/format.js')
		\ . ' ' . shellescape(file))
	call s:format(json_decode(output))
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
	command! -buffer TssReloadProjects :call tss#reloadProjects()
	command! -buffer -nargs=? TssRename :call tss#rename(<f-args>)
	command! -buffer TssStart :call tss#start()
	command! -buffer TssStop :call tss#stop()

	setlocal omnifunc=tss#omnicomplete

	if !g:tss_server_id
		call tss#start()
	endif
endfunction

" Return a list of omnicompletion entries for the current cursor position
function! tss#omnicomplete(findstart, base)
	let file = expand('%')
	let line = getline('.')
	let pos = getcurpos()

	let offset = pos[2]

	" Search backwards for first "iskeyword" identifier
	while offset > 0 && line[offset - 2] =~ "\\k"
		let offset -= 1
	endwhile

	if a:findstart
		" Ensure tsserver view of file is up-to-date
		call s:reloadFile(file)

		return offset - 1
	else
		let response = s:completions(file, pos[1], offset, a:base)
		call s:debug('Completion response:', response)

		if get(response, 'success', 0)
			let enableMenu = stridx(&completeopt, 'menu') != -1

			if enableMenu
				for comp in response.body
					call complete_add({ 'word': comp.name,
						\ 'menu': comp.kind })

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
			call s:error('Error requesting completions: ' . message)
			return []
		endif
	endif
endfunction

" Notify tsserver that a file is being edited
function! tss#openFile(file)
	if &filetype == 'javascript' && !g:tss_js
		return
	endif

	call s:debug('Opening', a:file)
	let job = jobstart(['node', s:path . '/../bin/open.js', a:file], {
		\ 'on_stderr': function('s:logHandler'),
		\ 'on_exit': function('s:openFileHandler')
		\ })
	let s:job_names[job] = 'Open ' . a:file
	let s:opening_files[job] = a:file
endfunction

" Display summary information for the symbol under the cursor
function! tss#quickinfo()
	let file = expand('%')
	let pos = getcurpos()

	" Ensure tsserver view of file is up-to-date
	call s:reloadFile(file)

	call s:debug('Getting quick info for', file)
	let output = system('node ' .
		\ shellescape(s:path . '/../bin/quickinfo.js') . ' ' .
		\ shellescape(file) . ' ' . pos[1] . ' ' . pos[2])

	let response = json_decode(output)
	call s:debug('Response:', response)

	if get(response, 'success', 0)
		call s:debug('Successful response')
		if get(response.body, 'displayString', '') != ''
			call s:print(response.body.displayString)
			if get(response.body, 'documentation', '') != ''
				call s:print("\n" . response.body.documentation)
			endif
		else
			call s:print('No hint at the cursor')
		endif
	else
		let message = get(response, 'message', string(response))
		call s:error('Error getting info: ' . message)
	endif
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

" Populate the location list with references to the symbol at the current
" cursor position
function! tss#references()
	call s:getLocations('references')
endfunction

" Reload project files in the tsserver instance
function! tss#reloadProjects()
	call s:debug('Reloading projects')
	call execute('!node ' . shellescape(s:path .
		\ '/../bin/reload-projects.js'))
endfunction

" Rename a symbol in a project
function! tss#rename(...)
	let flags = ' '
	let projectWide = 0

	if a:0 > 0
		if a:1 =~ 'c'
			let flags = flags . '-c '
		endif
		if a:1 =~ 's'
			let flags = flags . '-s '
		endif
		if a:1 =~ 'p'
			let projectWide = 1
		endif
	endif

	let file = expand('%')
	let pos = getcurpos()

	" Ensure tsserver view of all open project files is up-to-date
	call s:reloadFiles()

	call s:debug('Getting rename locations for symbol at (', pos[1], ',',
		\ pos[2], 'in', file)
	let output = system('node ' .
		\ shellescape(s:path . '/../bin/rename.js') . flags .
		\ shellescape(file) . ' ' . pos[1] . ' ' . pos[2])

	let response = json_decode(output)

	if !get(response, 'success', 0)
		let message = get(response, 'message', string(response))
		call s:error('Error getting rename locations: ' . message)
		return
	endif

	let body = get(response, 'body', {})
	let info = get(body, 'info', {})

	if !get(info, 'canRename', 0)
		let message = get(info, 'localizedErrorMessage', string(response))
		call s:error(message)
		return
	endif

	echohl String
	let symbol = input('New symbol name: ')
	echohl None

	if symbol == ''
		call s:debug('Rename canceled')
		return
	endif

	if symbol !~ '^[A-Za-z_\$][A-Za-z_\$0-9]*$'
		call s:error('"' . symbol . '" is not a valid identifier')
		return
	endif

	let allLocs = get(body, 'locs', [])
	for locs in allLocs
		if locs.file != file && !projectWide
			call s:debug('Skipping file', locs.file)
			continue
		endif
		call s:debug('Processing rename locs', locs)
		call s:renameLocations(locs.file, symbol, locs.locs)
	endfor
endfunction

" Start an instance of tsserver for the current TS project
function! tss#start()
	" Don't start the server if it's already running
	if g:tss_server_id
		return
	endif

	let cmd = ['node', s:path . '/../bin/start.js']
	if g:tss_debug_tsserver
		let cmd = add(cmd, '--debug-tsserver')
	endif

	call s:debug('Starting server')
	let g:tss_server_id = jobstart(cmd, {
		\ 'on_stderr': function('s:logHandler'),
		\ 'on_stdout': function('s:startHandler'),
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

	call s:debug('Stopping server')
	let job = jobstart(['node', s:path . '/../bin/stop.js'], {
		\ 'on_stderr': function('s:logHandler'),
		\ 'on_exit': function('s:exitHandler')
		\ })
	let s:job_names[job] = 'Server stop'
endfunction

" Get tags for the current file
function! tss#tags()
	call s:debug('Getting tags')
	let file = expand('%')
	return systemlist('node ' . shellescape(s:path . '/../bin/tags.js')
		\ . ' ' . shellescape(file))
endfunction

" ----------------------------------------------------------------------------
" Support functions
" ----------------------------------------------------------------------------

" Get completions for the given file and offset
function! s:completions(file, line, offset, ...)
	let prefix = a:0 > 0 ? (' ' . shellescape(a:1)) : ''
	let ignoreCase = g:tss_completion_ignore_case ? ' -i ' : ' '

	call s:debug('Getting completions for', a:file)
	let output = system('node ' .
		\ shellescape(s:path . '/../bin/completions.js') . ignoreCase .
		\ shellescape(a:file) . ' ' . a:line . ' ' . a:offset . prefix)

	return json_decode(output)
endfunction

" Run when a closeFile process finishes
function! s:closeFileHandler(job_id, code)
	let file = s:closing_files[a:job_id]
	unlet s:closing_files[a:job_id]

	if a:code == 0
		if has_key(s:open_files, file)
			unlet s:open_files[file]
		endif
	endif

	call s:exitHandler(a:job_id, a:code)
endfunction

" Log a debug message
function! s:debug(...)
	if g:tss_verbose
		redraw
		echom 'TSS:' join(a:000, ' ')
	endif
endfunction

" Handle exit messages from async jobs
function! s:exitHandler(job_id, code)
	if a:code
		call s:error(s:job_names[a:job_id] . ' failed: ' . a:code)
	endif

	call s:debug(s:job_names[a:job_id], 'ended')

	if a:job_id == g:tss_server_id
		" If the server job died, clear the server ID field
		let g:tss_server_id = 0
		let $VIM_TSS_PORT = ''
	endif
endfunction

" Log an error message
function! s:error(message)
	redraw
	echohl ErrorMsg | echo 'TSS:' a:message | echohl None
endfunction

" Implement a list of formatting directives in the current window
function! s:format(response)
	if !get(a:response, 'success', 0)
		let message = get(a:response, 'message', string(response))
		call s:error('Error formatting: ' . message)
		return
	endif

	" Save properties to restore later
	let view = winsaveview()
	let mark = split(execute('silent! marks k'))
	let tmp = getreg('m')
	let oldve = &ve

	" Allow selection to be one past EOL
	set ve+=onemore

	for entry in a:response.body
		call s:debug('Processing format entry', entry)

		let line = entry.start.line
		let offset = entry.start.offset
		let endLine = entry.end.line
		let endOffset = entry.end.offset

		" Delete the text from (line,offset)..(endLine,endOffset)
		call cursor(endLine, endOffset)
		:normal mk
		call cursor(line, offset)
		:normal d`k
		call s:debug('Deleted text from (' . line . ',' . offset . ') to ('
			\ . endLine . ',' . endOffset . ')')

		" If there's new content, paste it into the buffer
		let newText = entry.newText
		if entry.newText != ''
			call setreg('m', newText)
			let @m = newText
			:normal "mP
			call s:debug('Inserted "' . newText . '" at (' . line . ',' .
				\ offset . ')')
		endif
	endfor

	" Restore the mark if it previously existed, or delete it
	if mark[0] == 'mark'
		call s:debug('Restoring mark', mark)
		call cursor(mark[5], mark[6])
		:normal mk
	else
		call s:debug('Deleting mark k')
		delmarks k
	endif

	"Restore other saved settings
	let &ve = oldve
	call setreg('m', tmp)
	call winrestview(view)
endfunction

" Populate the location list with {references, definitions, implementations}
function! s:getLocations(type)
	" Clear the loclist
	call setloclist(0, [], 'r')

	let file = expand('%')
	let pos = getcurpos()

	" Ensure tsserver view of file is up-to-date
	call s:reloadFile(file)

	call s:debug('Finding', a:type)
	let output = system('node ' . shellescape(s:path . '/../bin/' . a:type
		\ . '.js') . ' ' . shellescape(file) . ' ' . pos[1] . ' ' . pos[2])
	call s:debug('Got output:', output)

	let response = json_decode(output)
	if get(response, 'success', 0)
		call setloclist(0, s:toLoclistEntries(response.body), 'a')

		" Jump to the first item in the list
		ll 1
	else
		let message = get(response, 'message', string(response))
		call s:error('Error requesting locations: ' . message)
		echom 'No results'
		return
	endif
endfunction

" Display messages from a process
function! s:logHandler(job_id, data)
	call s:debug('Log:', join(a:data))
endfunction

" Display a message
function! s:print(message)
	redraw
	echo a:message
endfunction

" Run when an openFile process finishes
function! s:openFileHandler(job_id, code)
	let file = s:opening_files[a:job_id]
	unlet s:opening_files[a:job_id]

	if a:code == 0
		if has_key(s:open_files, file)
			let s:open_files[file] = 1
		endif
	endif

	call s:exitHandler(a:job_id, a:code)
endfunction

" Notify tsserver that a file has new data
function! s:reloadFile(file)
	call s:debug('Reloading', a:file)
	call execute('w !node ' . shellescape(s:path . '/../bin/reload.js') . ' '
		\ . shellescape(a:file))
endfunction

" Notify tsserver that all open project files have new data
function! s:reloadFiles()
	" Save a reference to the original buffer
	let buf = bufnr('%')

	for file in keys(s:open_files)
		call execute('buffer ' . bufnr(file))
		call s:reloadFile(file)
	endfor

	" Switch back to the original buffer
	call execute('buffer ' . buf)
endfunction

" Rename instances of a symbol in a file
function! s:renameLocations(file, symbol, locs)
	call s:debug('Renaming', a:symbol, 'in', a:file, 'at', a:locs)

	let originalFile = expand('%')
	let originalPos = getcurpos()

	" Switch to the buffer of the file to be updated
	if a:file != originalFile
		call execute('edit ' . a:file)
		call s:debug('Opened', a:file)
	endif

	for loc in a:locs
		let start = loc.start
		let end = loc.end

		if start.line != end.line
			call s:warn('Skipping invalid rename loc', loc)
			continue
		endif

		let line = getline(start.line)
		let pre = start.offset == 1 ? '' : line[:start.offset - 2]
		let post = line[end.offset - 1:]

		call setline(start.line, pre . a:symbol . post)
	endfor

	if a:file != originalFile
		" Switch back to the original buffer
		call execute('buffer ' . originalFile)
		call setpos('.', originalPos)
	endif
endfunction

" Handle tsserver startup messages
function! s:startHandler(job_id, data)
	call s:logHandler(a:job_id, a:data)

	if exists('$VIM_TSS_PORT')
		return
	endif

	for line in a:data
		if line =~ '^VIM_TSS_PORT'
			let $VIM_TSS_PORT = split(line, '=')[1]

			call s:debug('Server started on port', $VIM_TSS_PORT)

			" After the server starts, notify it of all currently open
			" TypeScript files
			let buffers = filter(range(1, bufnr('$')), 'bufloaded(v:val)')
			let tsbuffers = filter(buffers,
				\ 'getbufvar(v:val, "&filetype") == "typescript"')
			let tsfiles = map(tsbuffers, 'bufname(v:val)')
			for file in tsfiles 
				call s:debug('Opening file', file)
				call tss#openFile(file)
			endfor
			" if s:startup_file != ''
			" 	call s:debug('Opening initial file', s:startup_file)
			" 	call tss#openFile(s:startup_file)
			" endif
		endif
	endfor
endfunction

" Convert a set of location objects to loclist entries
function! s:toLoclistEntries(locs)
	let entries = []
	for loc in a:locs
		let entries = add(entries, {
			\ 'filename': loc.file,
			\ 'lnum': loc.line,
			\ 'col': loc.offset,
			\ 'text': loc.text
			\ })
	endfor
	call s:debug('Created loclist entries:', entries)
	return entries
endfunction

" Log an error message
function! s:warn(message)
	echohl WarningMsg | echo 'TSS:' a:message | echohl None
endfunction

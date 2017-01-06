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

" Get completions for the given file and offset
function! tss#completions(file, line, offset, ...)
	let prefix = a:0 > 0 ? (' ' . shellescape(a:1)) : ''
	let ignoreCase = g:tss_completion_ignore_case ? ' -i ' : ' '

	call tss#debug('Getting completions for', a:file)
	let output = system('node ' .
		\ shellescape(s:path . '/../bin/completions.js') . ignoreCase .
		\ shellescape(a:file) . ' ' . a:line . ' ' . a:offset . prefix)

	return json_decode(output)
endfunction

" Log a debug message
function! tss#debug(...)
	if g:tss_verbose
		echom 'TSS:' join(a:000, ' ')
	endif
endfunction

" Populate the location list with the locations of definitions of the symbol
" at the current cursor position
function! tss#definition()
	call s:getLocations('definition')
endfunction

" Log an error message
function! tss#error(message)
	echohl WarningMsg | echo 'TSS:' a:message | echohl None
endfunction

" Populate the quickfix list with errors for the current buffer 
function! tss#errors()
	" Clear the quickfix list
	call setqflist([], 'r')

	let file = expand('%')

	" Ensure tsserver view of file is up-to-date
	call s:reloadFile(file)

	call tss#debug('Getting errors for', file)
	let output = system('node ' . shellescape(s:path . '/../bin/errors.js')
		\ . ' ' . shellescape(file) . ' -n -j')
	let response = json_decode(output)
	call tss#debug('Got errors response:', response)

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

	call tss#debug('Formatting', file)
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
	command! -buffer TssRename :call tss#rename()
	command! -buffer TssRenameComments :call tss#rename({ 'comments': 1 })
	command! -buffer TssRenameCommentsStrings :call tss#rename({ 'comments': 1, 'strings': 1 })
	command! -buffer TssRenameStrings :call tss#rename({ 'strings': 1 })
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
		let response = tss#completions(file, pos[1], offset, a:base)
		call tss#debug('Completion response:', response)

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
			call tss#error('Error requesting completions: ' . message)
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

	call tss#debug('Getting quick info for', file)
	let output = system('node ' .
		\ shellescape(s:path . '/../bin/quickinfo.js') . ' ' .
		\ shellescape(file) . ' ' . pos[1] . ' ' . pos[2])

	let response = json_decode(output)
	call tss#debug('Response:', response)

	if get(response, 'success', 0)
		redraw
		call tss#debug('Successful response')
		if get(response.body, 'displayString', '') != ''
			call tss#print(response.body.displayString)
			if get(response.body, 'documentation', '') != ''
				call tss#print("\n" . response.body.documentation)
			endif
		else
			call tss#print('No hint at the cursor')
		endif
	else
		let message = get(response, 'message', string(response))
		call tss#error('Error getting info: ' . message)
	endif
endfunction

" Reload project files in the tsserver instance
function! tss#reloadProjects()
	call tss#debug('Reloading projects')
	call execute('!node ' . shellescape(s:path . '/../bin/reload-projects.js'))
endfunction

function! tss#rename(...)
	let flags = ' '

	if a:0 > 0 && type(a:1) == type({})
		if get(a:1, 'comments', 0)
			let flags = flags . '-c '
		endif
		if get(a:1, 'strings', 0)
			let flags = flags . '-s '
		endif
	endif

	let file = expand('%')
	let pos = getcurpos()

	" Ensure tsserver view of file is up-to-date
	call s:reloadFile(file)

	call tss#debug('Getting rename locations for ' . file)
	let output = system('node ' .
		\ shellescape(s:path . '/../bin/rename.js') . flags .
		\ shellescape(file) . ' ' . pos[1] . ' ' . pos[2])

	let response = json_decode(output)
	
	if !get(response, 'success', 0)
		redraw
		let message = get(response, 'message', string(response))
		call tss#error('Error getting rename locations: ' . message)
		return
	endif

	let body = get(response, 'body', {})
	let info = get(body, 'info', {})

	if !get(info, 'canRename', 0)
		redraw
		let message = get(info, 'localizedErrorMessage', string(response))
		call tss#error(message)
		return
	endif

	echohl String
	let symbol = input('New symbol name: ')
	echohl None

	if symbol !~ '^[A-Za-z_\$][A-Za-z_\$0-9]*$'
		redraw
		call tss#error('"' . symbol . '" is not a valid identifier')
		return
	endif

	let locs = get(body, 'locs', [])
	let fileLocs = get(body, 'requested', [])
	let spanMap = get(body, 'spanMap', {})

	call s:renameLocations(file, symbol, fileLocs)
	" TODO: handle renames in other files
	" for filename in keys(spanMap)
	" 	call s:renameLocations(filename, symbol, spanMap[filename])
	" endfor
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

" Display a message
function! tss#print(message)
	echo a:message
endfunction

" Populate the location list with references to the symbol at the current
" cursor position
function! tss#references()
	call s:getLocations('references')
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

	let cmd = ['node', s:path . '/../bin/start.js']
	if g:tss_debug_tsserver
		let cmd = add(cmd, '--debug-tsserver')
	endif

	call tss#debug('Starting server for', s:startup_file)
	let g:tss_server_id = jobstart(cmd, {
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
function! s:format(response)
	if !get(a:response, 'success', 0)
		let message = get(a:response, 'message', string(response))
		call tss#error('Error formatting: ' . message)
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
		call tss#debug('Processing format entry', entry)

		let line = entry.start.line
		let offset = entry.start.offset
		let endLine = entry.end.line
		let endOffset = entry.end.offset

		" Delete the text from (line,offset)..(endLine,endOffset)
		call cursor(endLine, endOffset)
		:normal mk
		call cursor(line, offset)
		:normal d`k
		call tss#debug('Deleted text from (' . line . ',' . offset . ') to ('
			\ . endLine . ',' . endOffset . ')')

		" If there's new content, paste it into the buffer
		let newText = entry.newText
		if entry.newText != ''
			call setreg('m', newText)
			let @m = newText
			:normal "mP
			call tss#debug('Inserted "' . newText . '" at (' . line . ',' .
				\ offset . ')')
		endif
	endfor

	" Restore the mark if it previously existed, or delete it
	if mark[0] == 'mark'
		call tss#debug('Restoring mark', mark)
		call cursor(mark[5], mark[6])
		:normal mk
	else 
		call tss#debug('Deleting mark k')
		delmarks k
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
	call tss#debug('Reloading', a:file)
	call execute('w !node ' . shellescape(s:path . '/../bin/reload.js') . ' '
		\ . shellescape(a:file))
endfunction

" Populate the location list with {references, definitions, implementations}
function! s:getLocations(type)
	" Clear the loclist
	call setloclist(0, [], 'r')

	let file = expand('%')
	let pos = getcurpos()

	" Ensure tsserver view of file is up-to-date
	call s:reloadFile(file)

	call tss#debug('Finding', a:type)
	let output = system('node ' . shellescape(s:path . '/../bin/' . a:type
		\ . '.js') . ' ' . shellescape(file) . ' ' . pos[1] . ' ' . pos[2])
	call tss#debug('Got output:', output)

	let response = json_decode(output)
	if get(response, 'success', 0)
		call setloclist(0, s:toLoclistEntries(response.body), 'a')

		" Jump to the first item in the list
		ll 1
	else
		let message = get(response, 'message', string(response))
		call tss#error('Error requesting locations: ' . message)
		echom 'No results'
		return
	endif
endfunction 

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
	call tss#debug('Created loclist entries:', entries)
	return entries
endfunction

function! s:renameLocations(file, symbol, locs)
	for loc in a:locs
		let start = loc.start
		let end = loc.end

		if start.line != end.line
			" TODO: notify the user?
			continue
		endif

		let line = getline(start.line)

		let pre = start.offset == 1 ? '' : line[:(start.offset - 2)]
		let post = line[(end.offset - 1):]

		call setline(start.line, pre . a:symbol . post)
	endfor

	call s:reloadFile(a:file)
endfunction
